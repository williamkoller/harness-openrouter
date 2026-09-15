import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Tool } from "../../domain/tools/tool";

export class ReadDirTool implements Tool {
  readonly name = "read_dir";
  readonly description =
    "List files and directories at a given path. Returns entries prefixed with [DIR] or [FILE].";
  readonly parameters = {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Directory path. Defaults to current directory.",
      },
    },
    required: [],
  };

  async execute(args: Record<string, unknown>): Promise<string> {
    const path = resolve(String(args.path ?? "."));
    const entries = await readdir(path);
    if (entries.length === 0) return "(empty directory)";

    const lines: string[] = [];
    for (const entry of entries) {
      const s = await stat(join(path, entry));
      lines.push(`${s.isDirectory() ? "[DIR] " : "[FILE]"} ${entry}`);
    }
    return lines.join("\n");
  }
}