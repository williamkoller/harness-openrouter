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

function buildTools(): ToolRegistry {
  return new ToolRegistry()
    .register(new ReadDirTool())
    .register(new ReadFileTool())
    .register(new WriteFileTool())
    .register(new ExecuteBashTool());
}

async function main() {
  const llm = new OpenRouterLLMRepository(
    env.openRouterApiKey,
    env.model,
    env.baseUrl,
  );
  const tools = buildTools();
  const agent = new AgentService(llm, tools);

  const session = new SessionState({
    model: env.model,
    reasoning: env.reasoning,
    systemPrompt: env.systemPrompt,
  });

  const repl = new Repl({
    session,
    agent,
    tools,
    maxIterations: env.maxIterations,
    setModel: (m) => {
      llm.setModel(m);
      session.model = m;
    },
  });

  await repl.start();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});