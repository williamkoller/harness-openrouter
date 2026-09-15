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
import type { Animator } from "./anim/animator";
import type { SandboxMode } from '../infrastructure/approval/policies'
import { createRenderer, type Renderer } from './render'
import type { Message } from '../domain/entities/message'

export interface ReplDeps {
  session: SessionState;
  agent: AgentService;
  tools: ToolRegistry;
  anim: Animator;
  setModel(model: string): void;
  getApproval(): SandboxMode;
  setApproval(mode: SandboxMode): void;
  maxIterations: number;
}

export class Repl {
  private readonly rl: Interface;
  private readonly commands = new Map<string, Command>();
  private readonly renderer: Renderer;
  private alive = true;

  constructor(private readonly deps: ReplDeps) {
    this.rl = createInterface({ input, output });
    this.renderer = createRenderer(deps.anim);
    for (const cmd of COMMANDS) {
      this.commands.set(cmd.name, cmd);
      for (const a of cmd.aliases ?? []) this.commands.set(a, cmd);
    }
  }

  /**
   * Used by CliApprover. Always clears the spinner first so the prompt
   * never gets overwritten by an animation frame.
   */
  async prompt(question: string): Promise<string> {
    this.deps.anim.stopAll();
    return this.rl.question(question);
  }

  async start(): Promise<void> {
    this.banner();
    while (this.alive) {
      const line = await this.ask();
      if (line === null) break;
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("/")) await this.dispatch(trimmed);
      else await this.handleUserInput(trimmed);
    }
    this.deps.anim.stopAll();
    this.rl.close();
    console.log(paint.gray("\nbye."));
  }

  async runOnce(userInput: string): Promise<void> {
    await this.handleUserInput(userInput);
    this.deps.anim.stopAll();
    this.rl.close();
  }

  private async ask(): Promise<string | null> {
    try {
      return await this.rl.question(this.promptLine());
    } catch {
      return null;
    }
  }

  private promptLine(): string {
    const { session, anim } = this.deps;
    const flag = anim.isEnabled() ? "" : paint.gray(" · anim:off");
    return `${paint.cyan("›")} ${paint.gray(
      `${shortModel(session.model)} · ${session.reasoning} · ${this.deps.getApproval()}`,
    )}${flag} `;
  }

  private async dispatch(line: string): Promise<void> {
    const parsed = parseCommand(line);
    if (!parsed) return;

    const cmd = this.commands.get(parsed.name);
    if (!cmd) {
      console.log(paint.red(`unknown command: /${parsed.name}`));
      return;
    }
    if (parsed.args[0] === "help") {
      console.log(paint.gray(cmd.usage ?? `/${cmd.name}`));
      return;
    }
    await cmd.run(parsed.args, this.ctx());
  }

  private ctx(): CommandContext {
    const { anim } = this.deps;
    return {
      session: this.deps.session,
      tools: this.deps.tools,
      setModel: (m) => this.deps.setModel(m),
      setApproval: (m) => this.deps.setApproval(m),
      getApproval: () => this.deps.getApproval(),
      setAnimation: (v) => anim.setEnabled(v),
      getAnimation: () => anim.isEnabled(),
      exit: () => {
        this.alive = false;
      },
      out: (s) => console.log(s),
    };
  }

  private async handleUserInput(userInput: string): Promise<void> {
    const { session, agent, maxIterations, anim } = this.deps;

    await session.record({ role: "user", content: userInput });

    const messages: Message[] = [
      { role: "system", content: session.systemPrompt },
      ...session.history,
    ];

    const chatOptions: ChatOptions = { reasoning: session.reasoning };

    try {
      await agent.run({
        messages,
        maxIterations,
        chatOptions,
        onEvent: (e) => this.renderer.render(e),
      });
    } catch (err) {
      anim.stopAll();
      console.log(paint.red(`error: ${(err as Error).message}`));
    } finally {
      anim.stopAll();
      await session.commit(messages);
    }
    console.log();
  }

  private banner(): void {
    const { session, anim } = this.deps;
    const line = (s: string) => console.log(paint.gray(`│ ${s}`));
    console.log(paint.gray("╭──────────────────────────────────────────────"));
    line(`${paint.bold("harness")} ${paint.gray("·")} ${paint.cyan(session.model)}`);
    line(
      `${paint.gray("reasoning:")} ${paint.yellow(session.reasoning)}  ` +
        `${paint.gray("·")} ${paint.gray("approval:")} ${paint.yellow(this.deps.getApproval())}`,
    );
    line(
      `${paint.gray("session:")} ${paint.gray(session.sessionId)}  ` +
        `${paint.gray("·")} ${paint.gray("anim:")} ${paint.yellow(anim.isEnabled() ? "on" : "off")}`,
    );
    line(paint.gray("/help for commands"));
    console.log(paint.gray("╰──────────────────────────────────────────────\n"));
  }
}

function shortModel(model: string): string {
  const i = model.indexOf("/");
  return i === -1 ? model : model.slice(i + 1);
}