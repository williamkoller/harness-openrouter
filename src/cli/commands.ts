import type { Command } from "./command";
import type { ReasoningEffort } from "../domain/repositories/llm-repository";
import { SANDBOX_MODES, type SandboxMode } from "../infrastructure/approval/policies";
import { paint } from "./theme";

const REASONING_LEVELS: readonly ReasoningEffort[] = ["off", "low", "medium", "high"];

const help: Command = {
  name: "help",
  description: "List available commands.",
  aliases: ["?"],
  run(_args, ctx) {
    ctx.out(paint.bold("Available commands:"));
    for (const cmd of COMMANDS) {
      const aliases = cmd.aliases?.length
        ? paint.gray(` (${cmd.aliases.map((a) => "/" + a).join(", ")})`)
        : "";
      ctx.out(`  ${paint.cyan(("/" + cmd.name).padEnd(20))} ${cmd.description}${aliases}`);
    }
  },
};

const reasoning: Command = {
  name: "reasoning",
  description: `Show or set reasoning effort (${REASONING_LEVELS.join("|")}).`,
  aliases: ["r"],
  usage: "/reasoning [off|low|medium|high]",
  run(args, ctx) {
    const value = args[0]?.toLowerCase();
    if (!value) {
      ctx.out(`reasoning: ${paint.yellow(ctx.session.reasoning)}  ${paint.gray(`(${REASONING_LEVELS.join(" | ")})`)}`);
      return;
    }
    if (!REASONING_LEVELS.includes(value as ReasoningEffort)) {
      ctx.out(paint.red(`invalid: ${value}. Use ${REASONING_LEVELS.join(" | ")}.`));
      return;
    }
    ctx.session.reasoning = value as ReasoningEffort;
    ctx.out(`reasoning → ${paint.yellow(value)}`);
  },
};

const model: Command = {
  name: "model",
  description: "Show or set the OpenRouter model.",
  usage: "/model [provider/model]",
  run(args, ctx) {
    const value = args[0];
    if (!value) {
      ctx.out(`model: ${paint.cyan(ctx.session.model)}`);
      return;
    }
    ctx.setModel(value);
    ctx.out(`model → ${paint.cyan(value)}`);
  },
};

const approval: Command = {
  name: "approval",
  description: `Show or set the sandbox mode (${SANDBOX_MODES.join("|")}).`,
  usage: "/approval [auto|ask|read-only|deny-write]",
  run(args, ctx) {
    const value = args[0]?.toLowerCase();
    if (!value) {
      ctx.out(`approval: ${paint.yellow(ctx.getApproval())}  ${paint.gray(`(${SANDBOX_MODES.join(" | ")})`)}`);
      return;
    }
    if (!SANDBOX_MODES.includes(value as SandboxMode)) {
      ctx.out(paint.red(`invalid: ${value}. Use ${SANDBOX_MODES.join(" | ")}.`));
      return;
    }
    ctx.setApproval(value as SandboxMode);
    ctx.out(`approval → ${paint.yellow(value)}`);
  },
};

const tools: Command = {
  name: "tools",
  description: "List registered tools.",
  run(_args, ctx) {
    for (const t of ctx.tools.all()) {
      ctx.out(`${paint.magenta("•")} ${paint.bold(t.name)} ${paint.gray(`[${t.category}]`)} — ${t.description}`);
    }
  },
};

const history: Command = {
  name: "history",
  description: "Show message counts by role.",
  run(_args, ctx) {
    const byRole = new Map<string, number>();
    for (const m of ctx.session.history) byRole.set(m.role, (byRole.get(m.role) ?? 0) + 1);
    ctx.out(`total: ${ctx.session.history.length} messages`);
    for (const [role, n] of byRole) ctx.out(`  ${role}: ${n}`);
  },
};

const session: Command = {
  name: "session",
  description: "Show the current session id and file path.",
  run(_args, ctx) {
    ctx.out(`id:   ${paint.cyan(ctx.session.sessionId)}`);
    ctx.out(`path: ${paint.gray(ctx.session.sessionPath)}`);
  },
};

const clear: Command = {
  name: "clear",
  description: "Clear the current session history (persisted too).",
  async run(_args, ctx) {
    await ctx.session.reset();
    ctx.out(paint.gray("history cleared."));
  },
};

const exit: Command = {
  name: "exit",
  description: "Exit the REPL.",
  aliases: ["quit", "q"],
  run(_args, ctx) { ctx.exit(); },
};

const animate: Command = {
  name: "animate",
  description: "Show or toggle terminal animations (spinner + typewriter).",
  usage: "/animate [on|off]",
  run(args, ctx) {
    const v = args[0]?.toLowerCase();
    if (!v) {
      ctx.out(
        `animation: ${paint.yellow(ctx.getAnimation() ? "on" : "off")}  ${paint.gray("(on | off)")}`,
      );
      return;
    }
    if (v !== "on" && v !== "off") {
      ctx.out(paint.red(`invalid: ${v}. Use on | off.`));
      return;
    }
    ctx.setAnimation(v === "on");
    ctx.out(`animation → ${paint.yellow(v)}`);
  },
};

export const COMMANDS: Command[] = [
  help,
  model,
  reasoning,
  approval,
  animate,
  tools,
  history,
  session,
  clear,
  exit,
];