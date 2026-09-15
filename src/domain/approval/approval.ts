import type { Tool } from "../tools/tool";

export type ApprovalDecision = "allow" | "deny" | "ask";

export interface ApprovalRequest {
  tool: Tool;
  args: Record<string, unknown>;
}

export interface ApprovalResult {
  approved: boolean;
  reason?: string;
}

export interface ApprovalPolicy {
  decide(req: ApprovalRequest): ApprovalDecision;
}

export interface Approver {
  /** Invoked only when the policy decides "ask". */
  prompt(req: ApprovalRequest): Promise<ApprovalResult>;
}

export interface ApprovalGate {
  check(req: ApprovalRequest): Promise<ApprovalResult>;
}