import type { SessionState } from "./session-state";
import type { ToolRegistry } from "../domain/services/tool-registry";

export interface CommandContext {
  session: SessionState;
  tools: ToolRegistry;
  /** Atualiza o modelo usado pela LLM (sincroniza repo + session). */
  setModel(model: string): void;
  /** Pede para o REPL encerrar. */
  exit(): void;
  /** Printa no stdout do REPL. */
  out(line: string): void;
}

export interface Command {
  name: string;
  description: string;
  aliases?: string[];
  usage?: string;
  run(args: string[], ctx: CommandContext): Promise<void> | void;
}