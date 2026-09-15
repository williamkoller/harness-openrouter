import { createInterface, type Interface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { AgentService, type AgentEvent } from "../domain/services/agent-service";
import type { ToolRegistry } from "../domain/services/tool-registry";
import type { ChatOptions } from "../domain/repositories/llm-repository";
import { SessionState } from "./session-state";
import { parseCommand } from "./parse-command";
import { COMMANDS } from "./commands";
import type { Command, CommandContext } from "./command";
import { paint } from "./theme";

export interface ReplDeps {
  session: SessionState;
  agent: AgentService;
  tools: ToolRegistry;
  setModel(model: string): void;
  maxIterations: number;
}

export class Repl {
  private readonly rl: Interface;
  private readonly commands = new Map<string, Command>();
  private alive = true;

  constructor(private readonly deps: ReplDeps) {
    this.rl = createInterface({ input, output });
    for (const cmd of COMMANDS) {
      this.commands.set(cmd.name, cmd);
      for (const a of cmd.aliases ?? []) this.commands.set(a, cmd);
    }
  }

  async start() {
    this.banner();
    while (this.alive) {
      const line = await this.ask();
      if (line === null) break;
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("/")) {
        await this.dispatch(trimmed);
      } else {
        await this.runAgent(trimmed);
      }
    }
    this.rl.close();
    console.log(paint.gray("\naté logo."));
  }

  // -------- input --------

  private async ask(): Promise<string | null> {
    try {
      return await this.rl.question(this.prompt());
    } catch {
      return null; // Ctrl+D / rl fechado
    }
  }

  private prompt(): string {
    const { session } = this.deps;
    return `${paint.cyan("›")} ${paint.gray(
      `${shortModel(session.model)} · ${session.reasoning}`,
    )} `;
  }

  // -------- dispatch --------

  private async dispatch(line: string) {
    const parsed = parseCommand(line);
    if (!parsed) return;

    const cmd = this.commands.get(parsed.name);
    if (!cmd) {
      console.log(paint.red(`comando desconhecido: /${parsed.name}`));
      return;
    }
    if (parsed.args[0] === "help") {
      console.log(paint.gray(cmd.usage ?? `/${cmd.name}`));
      return;
    }

    await cmd.run(parsed.args, this.ctx());
  }

  private ctx(): CommandContext {
    return {
      session: this.deps.session,
      tools: this.deps.tools,
      setModel: (m) => this.deps.setModel(m),
      exit: () => {
        this.alive = false;
      },
      out: (s) => console.log(s),
    };
  }

  // -------- agent loop --------

  private async runAgent(userInput: string) {
    const { session, agent, maxIterations } = this.deps;
    const messages = session.buildMessages(userInput);
    const chatOptions: ChatOptions = { reasoning: session.reasoning };

    try {
      const returned = await agent.run({
        messages,
        maxIterations,
        chatOptions,
        onEvent: (event) => this.renderEvent(event),
      });
      session.commitHistory(returned);
    } catch (err) {
      console.log(paint.red(`erro: ${(err as Error).message}`));
    }
    console.log();
  }

  private renderEvent(event: AgentEvent) {
    switch (event.type) {
      case "assistant": {
        const m = event.message;
        if (m.reasoning) this.renderReasoning(m.reasoning);
        if (m.content) console.log(`${paint.green("◆")} ${m.content}`);
        for (const call of m.tool_calls ?? []) {
          const preview = truncate(call.function.arguments ?? "", 160);
          console.log(
            `${paint.magenta("→")} ${paint.bold(call.function.name)} ${paint.gray(preview)}`,
          );
        }
        break;
      }
      case "tool": {
        const name = event.message.name ?? "tool";
        const content = event.message.content ?? "";
        const preview = truncate(content.replace(/\n+/g, " ⏎ "), 200);
        console.log(`${paint.gray("←")} ${paint.dim(`[${name}]`)} ${preview}`);
        break;
      }
      case "iteration":
        // silencioso — descomente para debug
        // console.log(paint.gray(`· iter ${event.index + 1}`));
        break;
    }
  }

  private renderReasoning(text: string) {
    const lines = text.trim().split("\n");
    console.log(paint.italic(paint.gray("🧠 reasoning:")));
    for (const l of lines) console.log(paint.italic(paint.gray(`  ${l}`)));
  }

  // -------- banner --------

  private banner() {
    const { session } = this.deps;
    const line = (s: string) => console.log(paint.gray(`│ ${s}`));
    console.log(paint.gray("╭──────────────────────────────────────────────"));
    line(`${paint.bold("harness")} ${paint.gray("·")} ${paint.cyan(session.model)}`);
    line(
      `${paint.gray("reasoning:")} ${paint.yellow(session.reasoning)}  ` +
        `${paint.gray("·  /help para comandos")}`,
    );
    console.log(paint.gray("╰──────────────────────────────────────────────\n"));
  }
}

function shortModel(model: string): string {
  const i = model.indexOf("/");
  return i === -1 ? model : model.slice(i + 1);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n) + "…";
}