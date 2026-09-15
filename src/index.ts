import { AgentService } from "./domain/services/agent-service";
import { ToolRegistry } from "./domain/services/tool-registry";
import { env } from "./infrastructure/config/env";
import { OpenRouterLLMRepository } from "./infrastructure/llm/openrouter-llm-repository";
import { ExecuteBashTool } from "./infrastructure/tools/execute-bash-tool";
import { ReadDirTool } from "./infrastructure/tools/read-dir-tool";
import { ReadFileTool } from "./infrastructure/tools/read-file-tool";
import { WriteFileTool } from "./infrastructure/tools/write-file-tool";
import { SessionState } from "./cli/session-state";
import { Repl } from "./cli/repl";
import { parseArgs, helpText } from "./cli/args";
import { paint } from "./cli/theme";
import {
  defaultSessionDir,
  JsonlSessionStore,
} from "./infrastructure/persistence/json-session-store";
import { createPolicy, type SandboxMode } from "./infrastructure/approval/policies";
import { PolicyApprovalGate } from "./infrastructure/approval/policy-approval-gate";
import { CliApprover } from "./cli/cli-approver";
import { Animator } from "./cli/anim/animator";

function buildTools(): ToolRegistry {
  return new ToolRegistry()
    .register(new ReadDirTool())
    .register(new ReadFileTool())
    .register(new WriteFileTool())
    .register(new ExecuteBashTool());
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(helpText());
    return;
  }

  const llm = new OpenRouterLLMRepository(
    env.openRouterApiKey,
    args.model ?? env.model,
    env.baseUrl,
    { timeoutMs: env.httpTimeoutMs, maxRetries: env.httpMaxRetries },
  );

  const tools = buildTools();

  const store = new JsonlSessionStore(
    args.resume
      ? { id: args.resume, dir: env.sessionDir ?? defaultSessionDir() }
      : env.sessionDir
        ? { dir: env.sessionDir }
        : {},
  );

  const session = new SessionState({
    model: llm.getModel(),
    reasoning: args.reasoning ?? env.reasoning,
    systemPrompt: env.systemPrompt,
    store,
  });

  const anim = new Animator();

  // --- Approval wiring -------------------------------------------------------
  // The gate needs to read the *current* policy on every check, otherwise a
  // runtime /approval change would have no effect. We therefore hand the gate a
  // getter instead of the policy instance, and rebuild the policy when the mode
  // changes.
  let currentMode: SandboxMode = args.approval ?? env.sandboxMode;
  let policy = createPolicy({ mode: currentMode });

  // The approver needs to prompt through the same readline interface the REPL
  // owns. Since the REPL in turn needs the agent (which needs the approver),
  // we hold a late-bound reference and only dereference it at call time.
  let replRef: Repl | null = null;

  const approver = new CliApprover(async (q) => {
    if (!replRef) throw new Error("approver invoked before REPL was constructed");
    return replRef.prompt(q);
  });

  const gate = new PolicyApprovalGate(() => policy, approver);
  const agent = new AgentService(llm, tools, gate);

  // --- REPL ------------------------------------------------------------------
  const repl = new Repl({
    session,
    agent,
    tools,
    anim,
    maxIterations: env.maxIterations,
    setModel: (m) => {
      llm.setModel(m);
      session.model = m;
    },
    getApproval: () => currentMode,
    setApproval: (m) => {
      currentMode = m;
      policy = createPolicy({ mode: m }); // gate reads this via the getter
    },
  });

  replRef = repl; // now the approver can safely call repl.prompt()

  // --- Resume / run ----------------------------------------------------------
  const restored = await session.load();
  if (restored > 0) {
    console.log(
      paint.gray(`resumed session ${session.sessionId} (${restored} messages)`),
    );
  }

  if (args.print) {
    await repl.runOnce(args.print);
    return;
  }

  await repl.start();
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});