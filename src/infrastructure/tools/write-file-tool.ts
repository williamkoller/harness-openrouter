import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Tool } from "../../domain/tools/tool";

export class WriteFileTool implements Tool {
  readonly name = "write_file";
  readonly description =
    "Write (create/overwrite) a text file. Creates parent directories.";
  readonly parameters = {
    type: "object",
    properties: {
      path: { type: "string", description: "File path to write." },
      content: { type: "string", description: "Full text content." },
      append: {
        type: "boolean",
        description: "If true, append instead of overwrite. Default false.",
      },
    },
    required: ["path", "content"],
  };

  async execute(args: Record<string, unknown>): Promise<string> {
    const path = resolve(String(args.path));
    const content = String(args.content ?? "");
    const append = Boolean(args.append ?? false);

    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, { encoding: "utf8", flag: append ? "a" : "w" });

    return `OK: ${append ? "appended" : "wrote"} ${content.length} bytes to ${path}`;
  }
}