import { describe, expect, test } from "bun:test";
import { createPolicy } from "../src/infrastructure/approval/policies";
import type { Tool } from "../src/domain/tools/tool";

const mkTool = (name: string, category: Tool["category"]): Tool => ({
  name, category, description: name, parameters: {}, async execute() { return ""; },
});

describe("sandbox policies", () => {
  test("auto allows everything", () => {
    const p = createPolicy({ mode: "auto" });
    expect(p.decide({ tool: mkTool("t", "exec"), args: {} })).toBe("allow");
  });

  test("read-only denies non-read tools", () => {
    const p = createPolicy({ mode: "read-only" });
    expect(p.decide({ tool: mkTool("r", "read"), args: {} })).toBe("allow");
    expect(p.decide({ tool: mkTool("w", "write"), args: {} })).toBe("deny");
    expect(p.decide({ tool: mkTool("e", "exec"), args: {} })).toBe("deny");
  });

  test("deny-write asks for write/exec", () => {
    const p = createPolicy({ mode: "deny-write" });
    expect(p.decide({ tool: mkTool("r", "read"), args: {} })).toBe("allow");
    expect(p.decide({ tool: mkTool("w", "write"), args: {} })).toBe("ask");
  });

  test("allowlisted commands are auto-allowed in deny-write mode", () => {
    const p = createPolicy({ mode: "deny-write", allowlist: { commands: ["ls", "git status"] } });
    const exec = mkTool("e", "exec");
    expect(p.decide({ tool: exec, args: { command: "ls -la" } })).toBe("allow");
    expect(p.decide({ tool: exec, args: { command: "rm -rf /" } })).toBe("ask");
  });
});