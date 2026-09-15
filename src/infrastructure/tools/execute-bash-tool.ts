import { spawn } from "node:child_process";
import type { Tool } from "../../domain/tools/tool";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 100_000;

export class ExecuteBashTool implements Tool {
  readonly name = "execute_bash";
  readonly category = "exec" as const;
  readonly description = "Execute a shell command (bash -c) and return stdout/stderr/exit code.";
  readonly parameters = {
    type: "object",
    properties: {
      command: { type: "string", description: "Shell command to execute." },
      cwd: { type: "string", description: "Working directory (optional)." },
      timeout_ms: { type: "number", description: `Timeout in ms (default ${DEFAULT_TIMEOUT_MS}).` },
    },
    required: ["command"],
  };

  async execute(args: Record<string, unknown>): Promise<string> {
    const command = String(args.command);
    const cwd = args.cwd ? String(args.cwd) : process.cwd();
    const timeoutMs = Number(args.timeout_ms ?? DEFAULT_TIMEOUT_MS);

    return new Promise((resolvePromise) => {
      const child = spawn("bash", ["-c", command], { cwd });

      let stdout = "";
      let stderr = "";
      let killed = false;

      const cap = (s: string) => (s.length > MAX_OUTPUT_BYTES ? s.slice(0, MAX_OUTPUT_BYTES) + "\n...[truncated]" : s);

      const timer = setTimeout(() => {
        killed = true;
        child.kill("SIGKILL");
      }, timeoutMs);

      child.stdout.on("data", (d) => (stdout += d.toString()));
      child.stderr.on("data", (d) => (stderr += d.toString()));

      child.on("close", (code) => {
        clearTimeout(timer);
        const parts = [
          `exit_code: ${code}${killed ? " (timeout)" : ""}`,
          stdout ? `stdout:\n${cap(stdout).trimEnd()}` : "",
          stderr ? `stderr:\n${cap(stderr).trimEnd()}` : "",
        ].filter(Boolean);
        resolvePromise(parts.join("\n"));
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        resolvePromise(`Error spawning bash: ${err.message}`);
      });
    });
  }
}