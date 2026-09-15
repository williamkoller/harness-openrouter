export interface ParsedCommand {
  name: string;
  args: string[];
}

export function parseCommand(line: string): ParsedCommand | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("/")) return null;
  const [rawName = "", ...args] = trimmed.slice(1).split(/\s+/);
  return { name: rawName.toLowerCase(), args };
}