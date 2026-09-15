import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Tool } from "../../domain/tools/tool";

const MAX_BYTES = 200_000;

export class ReadFileTool implements Tool {
  readonly name = "read_file";
  readonly description =
    "Read the content of a file (UTF-8). Truncates to ~200KB.";
  readonly parameters = {
    type: "object",
    properties: {
      path: { type: "string", description: "File path to read." },
    },
    required: ["path"],
  };

  async execute(args: Record<string, unknown>): Promise<string> {
    const path = resolve(String(args.path));
    const buf = await readFile(path);
    const truncated = buf.byteLength > MAX_BYTES;
    const text = buf.subarray(0, MAX_BYTES).toString("utf8");
    return truncated
      ? `${text}\n\n... [truncated at ${MAX_BYTES} bytes]`
      : text;
  }
}