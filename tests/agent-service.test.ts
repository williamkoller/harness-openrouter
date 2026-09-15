import { describe, expect, test } from "bun:test";
import { AgentService, type AgentEvent } from "../src/domain/services/agent-service";
import { ToolRegistry } from "../src/domain/services/tool-registry";
import type { LLMRepository, LLMResponse } from "../src/domain/repositories/llm-repository";
import type { ApprovalGate, ApprovalResult } from "../src/domain/approval/approval";
import type { Tool } from "../src/domain/tools/tool";
import type { Message } from "../src/domain/entities/message";

class ScriptedLLM implements LLMRepository {
  public calls = 0;
  constructor(private readonly script: LLMResponse[]) {}
  async chat(): Promise<LLMResponse> {
    const r = this.script[this.calls++];
    if (!r) throw new Error("ScriptedLLM: out of script");
    return r;
  }
}

const allowAll: ApprovalGate = {
  async check(): Promise<ApprovalResult> { return { approved: true }; },
};

const denyAll: ApprovalGate = {
  async check(): Promise<ApprovalResult> { return { approved: false, reason: "no" }; },
};

const echoTool: Tool = {
  name: "echo",
  category: "read",
  description: "echo",
  parameters: { type: "object", properties: { v: { type: "string" } }, required: ["v"] },
  async execute(args) { return `echoed:${args.v}`; },
};

describe("AgentService", () => {
  test("returns immediately when there are no tool calls", async () => {
    const llm = new ScriptedLLM([{ content: "hi", reasoning: null, toolCalls: [] }]);
    const svc = new AgentService(llm, new ToolRegistry(), allowAll);
    const messages: Message[] = [{ role: "user", content: "hi" }];
    await svc.run({ messages });
    expect(messages).toHaveLength(2);
    expect(messages[1]!.content).toBe("hi");
  });

  test("executes a tool and feeds the result back", async () => {
    const llm = new ScriptedLLM([
      {
        content: null,
        reasoning: "thinking",
        toolCalls: [
          { id: "c1", type: "function", function: { name: "echo", arguments: JSON.stringify({ v: "x" }) } },
        ],
      },
      { content: "done", reasoning: null, toolCalls: [] },
    ]);
    const tools = new ToolRegistry().register(echoTool);
    const svc = new AgentService(llm, tools, allowAll);
    const events: AgentEvent[] = [];
    const messages: Message[] = [{ role: "user", content: "go" }];

    await svc.run({
      messages,
      onEvent: (e) => { events.push(e); }, // ← corpo de bloco, retorno void
    });

    const toolMsg = messages.find((m) => m.role === "tool");
    expect(toolMsg?.content).toBe("echoed:x");
    expect(events.some((e) => e.type === "tool")).toBe(true);
  });

  test("denied tool call produces an error tool message and does not execute", async () => {
    let executed = false;
    const tool: Tool = { ...echoTool, async execute() { executed = true; return "nope"; } };

    const llm = new ScriptedLLM([
      {
        content: null,
        reasoning: null,
        toolCalls: [{ id: "c1", type: "function", function: { name: "echo", arguments: "{}" } }],
      },
      { content: "blocked", reasoning: null, toolCalls: [] },
    ]);
    const tools = new ToolRegistry().register(tool);
    const svc = new AgentService(llm, tools, denyAll);

    const messages: Message[] = [{ role: "user", content: "go" }];
    await svc.run({ messages });

    expect(executed).toBe(false);
    const toolMsg = messages.find((m) => m.role === "tool");
    expect(toolMsg?.content).toContain("no");
  });

  test("invalid JSON in arguments is reported as a tool error", async () => {
    const llm = new ScriptedLLM([
      {
        content: null, reasoning: null,
        toolCalls: [{ id: "c1", type: "function", function: { name: "echo", arguments: "{not json" } }],
      },
      { content: "ok", reasoning: null, toolCalls: [] },
    ]);
    const tools = new ToolRegistry().register(echoTool);
    const svc = new AgentService(llm, tools, allowAll);
    const messages: Message[] = [{ role: "user", content: "go" }];
    await svc.run({ messages });
    expect(messages.find((m) => m.role === "tool")?.content).toMatch(/invalid arguments/);
  });

  test("stops after maxIterations to avoid infinite loops", async () => {
    const llm: LLMRepository = {
      async chat(): Promise<LLMResponse> {
        return {
          content: null, reasoning: null,
          toolCalls: [{ id: "c", type: "function", function: { name: "echo", arguments: "{}" } }],
        };
      },
    };
    const tools = new ToolRegistry().register(echoTool);
    const svc = new AgentService(llm, tools, allowAll);
    const messages: Message[] = [{ role: "user", content: "go" }];
    await svc.run({ messages, maxIterations: 3 });
    // 1 user + (assistant + tool) * 3
    expect(messages).toHaveLength(1 + 3 * 2);
  });

  test("emits llm-start before the LLM call and tool-start before execution", async () => {
    const order: string[] = [];
    const llm: LLMRepository = {
      async chat(): Promise<LLMResponse> {
        order.push("llm");
        if (order.filter((o) => o === "llm").length === 1) {
          return {
            content: null,
            reasoning: null,
            toolCalls: [
              { id: "c1", type: "function", function: { name: "echo", arguments: "{}" } },
            ],
          };
        }
        return { content: "done", reasoning: null, toolCalls: [] };
      },
    };

    const tools = new ToolRegistry().register({
      name: "echo",
      category: "read",
      description: "echo",
      parameters: {},
      async execute() { order.push("exec"); return "ok"; },
    });

    const svc = new AgentService(llm, tools, allowAll);
    const messages: Message[] = [{ role: "user", content: "go" }];

    await svc.run({
      messages,
      onEvent: (e) => {
        if (e.type === "llm-start") order.push("llm-start");
        if (e.type === "tool-start") order.push("tool-start");
      },
    });

    expect(order).toEqual([
      "llm-start", "llm",
      "tool-start", "exec",
      "llm-start", "llm",
    ]);
  });
});