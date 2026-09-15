import { describe, expect, test } from "bun:test";
import { ToolRegistry } from "../src/domain/services/tool-registry";
import type { Tool } from "../src/domain/tools/tool";

const stub = (name: string, category: Tool["category"] = "read"): Tool => ({
  name,
  category,
  description: `${name} tool`,
  parameters: { type: "object", properties: {}, required: [] },
  async execute() { return "ok"; },
});

describe("ToolRegistry", () => {
  test("registers and returns tools", () => {
    const r = new ToolRegistry().register(stub("a")).register(stub("b"));
    expect(r.all().map((t) => t.name)).toEqual(["a", "b"]);
    expect(r.get("a")?.name).toBe("a");
  });

  test("rejects duplicates", () => {
    const r = new ToolRegistry().register(stub("a"));
    expect(() => r.register(stub("a"))).toThrow(/already registered/);
  });

  test("definitions() shape matches OpenAI tools schema", () => {
    const r = new ToolRegistry().register(stub("read_file"));
    const [def] = r.definitions();
    expect(def?.type).toBe("function");
    expect(def?.function.name).toBe("read_file");
    expect(def?.function.parameters).toEqual({ type: "object", properties: {}, required: [] });
  });
});