import type { Command } from "./command";
import type { ReasoningEffort } from "../domain/repositories/llm-repository";
import { paint } from "./theme";

const REASONING_LEVELS: ReasoningEffort[] = ["off", "low", "medium", "high"];

const help: Command = {
  name: "help",
  description: "Lista comandos disponíveis.",
  aliases: ["?"],
  run(_args, ctx) {
    ctx.out(paint.bold("Comandos disponíveis:"));
    for (const cmd of COMMANDS) {
      const aliases = cmd.aliases?.length
        ? paint.gray(` (${cmd.aliases.map((a) => "/" + a).join(", ")})`)
        : "";
      ctx.out(
        `  ${paint.cyan("/" + cmd.name).padEnd(24)} ${cmd.description}${aliases}`,
      );
    }
  },
};

const reasoning: Command = {
  name: "reasoning",
  description: `Mostra/define reasoning effort (${REASONING_LEVELS.join("|")}).`,
  aliases: ["reason", "r"],
  usage: "/reasoning [off|low|medium|high]",
  run(args, ctx) {
    const value = args[0]?.toLowerCase();
    if (!value) {
      ctx.out(
        `reasoning atual: ${paint.yellow(ctx.session.reasoning)}  ${paint.gray(
          `(use ${REASONING_LEVELS.join(" | ")})`,
        )}`,
      );
      return;
    }
    if (!REASONING_LEVELS.includes(value as ReasoningEffort)) {
      ctx.out(paint.red(`inválido: ${value}. Use ${REASONING_LEVELS.join(" | ")}.`));
      return;
    }
    ctx.session.reasoning = value as ReasoningEffort;
    ctx.out(`reasoning → ${paint.yellow(value)}`);
  },
};

const model: Command = {
  name: "model",
  description: "Mostra/define o modelo OpenRouter.",
  usage: "/model [provider/model]",
  run(args, ctx) {
    const value = args[0];
    if (!value) {
      ctx.out(`model atual: ${paint.cyan(ctx.session.model)}`);
      return;
    }
    ctx.setModel(value);
    ctx.out(`model → ${paint.cyan(value)}`);
  },
};

const clear: Command = {
  name: "clear",
  description: "Limpa o histórico da conversa.",
  run(_args, ctx) {
    ctx.session.clear();
    ctx.out(paint.gray("histórico limpo."));
  },
};

const tools: Command = {
  name: "tools",
  description: "Lista as tools registradas.",
  run(_args, ctx) {
    for (const t of ctx.tools.all()) {
      ctx.out(`${paint.magenta("•")} ${paint.bold(t.name)} — ${t.description}`);
    }
  },
};

const history: Command = {
  name: "history",
  description: "Mostra quantas mensagens estão no histórico.",
  run(_args, ctx) {
    const byRole = new Map<string, number>();
    for (const m of ctx.session.history) {
      byRole.set(m.role, (byRole.get(m.role) ?? 0) + 1);
    }
    ctx.out(`total: ${ctx.session.history.length} mensagens`);
    for (const [role, n] of byRole) ctx.out(`  ${role}: ${n}`);
  },
};

const exit: Command = {
  name: "exit",
  description: "Sai do REPL.",
  aliases: ["quit", "q"],
  run(_args, ctx) {
    ctx.exit();
  },
};

export const COMMANDS: Command[] = [
  help,
  reasoning,
  model,
  clear,
  tools,
  history,
  exit,
];