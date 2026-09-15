import type { ApprovalPolicy, ApprovalRequest } from "../../domain/approval/approval";

export type SandboxMode = "auto" | "ask" | "read-only" | "deny-write";

export const SANDBOX_MODES: readonly SandboxMode[] = ["auto", "ask", "read-only", "deny-write"];

export interface SandboxConfig {
  mode: SandboxMode;
  allowlist?: { commands?: string[]; paths?: string[] };
}

export function createPolicy(config: SandboxConfig): ApprovalPolicy {
  return {
    decide(req: ApprovalRequest) {
      if (isAllowlisted(req, config)) return "allow";

      switch (config.mode) {
        case "auto":        return "allow";
        case "read-only":   return req.tool.category === "read" ? "allow" : "deny";
        case "deny-write":  return req.tool.category === "read" ? "allow" : "ask";
        case "ask":         return req.tool.category === "read" ? "allow" : "ask";
      }
    },
  };
}

function isAllowlisted(req: ApprovalRequest, config: SandboxConfig): boolean {
  const list = config.allowlist;
  if (!list) return false;

  if (req.tool.category === "exec" && list.commands?.length) {
    const command = String(req.args.command ?? "");
    return list.commands.some((prefix) => command.startsWith(prefix));
  }
  if (list.paths?.length) {
    const path = String(req.args.path ?? "");
    return list.paths.some((p) => path.startsWith(p));
  }
  return false;
}