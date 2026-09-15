import type { ReasoningEffort } from "../domain/repositories/llm-repository";
import { SANDBOX_MODES, type SandboxMode } from "../infrastructure/approval/policies";

export interface CliArgs {
  print?: string;
  model?: string;
  reasoning?: ReasoningEffort;
  approval?: SandboxMode;
  resume?: string;
  help?: boolean;
}

const REASONING_LEVELS: readonly ReasoningEffort[] = ["off", "low", "medium", "high"];

export function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const next = () => {
      const v = argv[++i];
      if (!v) throw new Error(`Missing value for ${a}`);
      return v;
    };
    switch (a) {
      case "-p": case "--print":     out.print = next(); break;
      case "-m": case "--model":     out.model = next(); break;
      case "-r": case "--reasoning": {
        const v = next();
        if (!REASONING_LEVELS.includes(v as ReasoningEffort)) {
          throw new Error(`Invalid reasoning "${v}". Use ${REASONING_LEVELS.join("|")}.`);
        }
        out.reasoning = v as ReasoningEffort;
        break;
      }
      case "-a": case "--approval": {
        const v = next();
        if (!SANDBOX_MODES.includes(v as SandboxMode)) {
          throw new Error(`Invalid approval "${v}". Use ${SANDBOX_MODES.join("|")}.`);
        }
        out.approval = v as SandboxMode;
        break;
      }
      case "--resume":               out.resume = next(); break;
      case "-h": case "--help":      out.help = true; break;
      default:
        if (a.startsWith("-")) throw new Error(`Unknown flag: ${a}`);
        // Positional args are treated as the one-shot prompt.
        out.print = out.print ? `${out.print} ${a}` : a;
    }
  }
  return out;
}

export function helpText(): string {
  return `harness — OpenRouter + DeepSeek tool-calling CLI

Usage:
  harness                     Start an interactive REPL
  harness -p "<prompt>"       Run one prompt and exit
  harness --resume <id>       Resume a stored session

Flags:
  -p, --print <prompt>        One-shot prompt
  -m, --model <id>            OpenRouter model (default from OPENROUTER_MODEL)
  -r, --reasoning <level>     off | low | medium | high
  -a, --approval <mode>       auto | ask | read-only | deny-write
      --resume <id>           Load a previous session by id
  -h, --help                  Show this help

REPL commands:
  /help  /model  /reasoning  /approval  /tools  /history  /session  /clear  /exit
`;
}