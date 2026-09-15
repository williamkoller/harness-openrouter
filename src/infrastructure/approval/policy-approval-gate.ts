// src/infrastructure/approval/policy-approval-gate.ts
import type {
  ApprovalDecision,
  ApprovalGate,
  ApprovalPolicy,
  ApprovalRequest,
  ApprovalResult,
  Approver,
} from "../../domain/approval/approval";

export type PolicySource = ApprovalPolicy | (() => ApprovalPolicy);

export class PolicyApprovalGate implements ApprovalGate {
  constructor(
    private readonly policy: PolicySource,
    private readonly approver?: Approver,
    private readonly onDecision?: (
      req: ApprovalRequest,
      result: ApprovalResult,
      decision: ApprovalDecision,
    ) => void,
  ) {}

  async check(req: ApprovalRequest): Promise<ApprovalResult> {
    const policy =
      typeof this.policy === "function" ? this.policy() : this.policy;

    const decision = policy.decide(req);
    const finish = (result: ApprovalResult) => {
      this.onDecision?.(req, result, decision);
      return result;
    };

    if (decision === "allow") return finish({ approved: true });
    if (decision === "deny") return finish({ approved: false, reason: "denied by policy" });
    if (!this.approver) return finish({ approved: false, reason: "no approver configured" });

    return finish(await this.approver.prompt(req));
  }
}