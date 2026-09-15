import type {
  ApprovalRequest,
  ApprovalResult,
  Approver,
} from "../domain/approval/approval";
import { paint } from "./theme";
import { truncate } from "./render";

export interface PromptFn {
  (question: string): Promise<string>;
}

export class CliApprover implements Approver {
  private readonly alwaysAllow = new Set<string>();

  constructor(private readonly ask: PromptFn) {}

  /** Called by /clear so "always" decisions do not leak across sessions. */
  reset(): void {
    this.alwaysAllow.clear();
  }

  async prompt(req: ApprovalRequest): Promise<ApprovalResult> {
    const key = req.tool.name;
    if (this.alwaysAllow.has(key)) {
      return { approved: true, reason: "allowed by remembered decision" };
    }

    console.log();
    console.log(paint.yellow(`⚠ approval required: ${paint.bold(req.tool.name)} ${paint.gray(`[${req.tool.category}]`)}`));
    for (const [k, v] of Object.entries(req.args)) {
      console.log(paint.gray(`  ${k}: ${truncate(stringify(v), 300)}`));
    }

    const answer = (await this.ask(paint.cyan("[y]es / [n]o / [a]lways> "))).trim().toLowerCase();

    if (answer === "a" || answer === "always") {
      this.alwaysAllow.add(key);
      return { approved: true, reason: "approved (always)" };
    }
    if (answer === "y" || answer === "yes") return { approved: true };
    return { approved: false, reason: "denied by user" };
  }
}

function stringify(v: unknown): string {
  return typeof v === "string" ? v : JSON.stringify(v);
}