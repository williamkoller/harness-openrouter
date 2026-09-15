export type ToolCategory = "read" | "write" | "exec";

export interface Tool {
  readonly name: string;
  readonly description: string;
  readonly category: ToolCategory;
  readonly parameters: Record<string, unknown>;
  execute(args: Record<string, unknown>): Promise<string>;
}