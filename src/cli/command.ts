import type { SessionState } from "./session-state";
import type { ToolRegistry } from "../domain/services/tool-registry";
import type { SandboxMode } from "../infrastructure/approval/policies";

export interface CommandContext {
  session: SessionState;
  tools: ToolRegistry;
  setModel(model: string): void;
  setApproval(mode: SandboxMode): void;
  getApproval(): SandboxMode;
  setAnimation(enabled: boolean): void;
  getAnimation(): boolean;
  exit(): void;
  out(line: string): void;
}

export interface Command {
  name: string;
  description: string;
  aliases?: string[];
  usage?: string;
  run(args: string[], ctx: CommandContext): Promise<void> | void;
}