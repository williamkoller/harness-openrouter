import type { Message } from "../entities/message";
import type {
  ChatOptions,
  LLMRepository,
} from "../repositories/llm-repository";
import type { ToolRegistry } from "./tool-registry";
import type { ApprovalGate } from "../approval/approval";
import type { Tool } from "../tools/tool";

export type AgentEvent =
  | { type: "iteration"; index: number }
  | { type: "llm-start" }
  | { type: "assistant"; message: Message }
  | { type: "tool-start"; name: string }
  | { type: "tool"; message: Message }
  | { type: "tool-denied"; name: string; reason: string };

export type AgentEventHandler = (event: AgentEvent) => void | Promise<void>;

export interface AgentRunOptions {
  messages: Message[];
  maxIterations?: number;
  chatOptions?: ChatOptions;
  onEvent?: AgentEventHandler;
}

export class AgentService {
  constructor(
    private readonly llm: LLMRepository,
    private readonly tools: ToolRegistry,
    private readonly gate: ApprovalGate,
  ) {}

  async run(opts: AgentRunOptions): Promise<Message[]> {
    const { messages, maxIterations = 12, chatOptions, onEvent } = opts;

    for (let i = 0; i < maxIterations; i++) {
      await onEvent?.({ type: "iteration", index: i });
      await onEvent?.({ type: "llm-start" });

      const response = await this.llm.chat(
        messages,
        this.tools.definitions(),
        chatOptions,
      );

      const assistantMsg: Message = {
        role: "assistant",
        content: response.content,
        reasoning: response.reasoning,
        ...(response.toolCalls.length > 0 && { tool_calls: response.toolCalls }),
      };
      messages.push(assistantMsg);
      await onEvent?.({ type: "assistant", message: assistantMsg });

      if (response.toolCalls.length === 0) return messages;

      for (const call of response.toolCalls) {
        const toolMsg = await this.handleToolCall(call, onEvent);
        messages.push(toolMsg);
      }
    }

    return messages;
  }

  private async handleToolCall(
    call: { id: string; function: { name: string; arguments: string } },
    onEvent?: AgentEventHandler,
  ): Promise<Message> {
    const base = {
      role: "tool" as const,
      tool_call_id: call.id,
      name: call.function.name,
    };

    const tool = this.tools.get(call.function.name);
    if (!tool) {
      const msg: Message = { ...base, content: `Error: tool "${call.function.name}" not found` };
      await onEvent?.({ type: "tool", message: msg });
      return msg;
    }

    let args: Record<string, unknown>;
    try {
      args = call.function.arguments
        ? (JSON.parse(call.function.arguments) as Record<string, unknown>)
        : {};
    } catch (err) {
      const msg: Message = { ...base, content: `Error: invalid arguments JSON — ${(err as Error).message}` };
      await onEvent?.({ type: "tool", message: msg });
      return msg;
    }

    // Approval runs before the spinner starts — the approver prints its own
    // prompt and needs a clean line to do so.
    const approval = await this.gate.check({ tool: tool as Tool, args });
    if (!approval.approved) {
      const reason = approval.reason ?? "tool call denied";
      const msg: Message = { ...base, content: `Error: ${reason}` };
      await onEvent?.({ type: "tool-denied", name: tool.name, reason });
      await onEvent?.({ type: "tool", message: msg });
      return msg;
    }

    await onEvent?.({ type: "tool-start", name: tool.name });

    let content: string;
    try {
      content = await tool.execute(args);
    } catch (err) {
      content = `Error: ${(err as Error).message}`;
    }

    const msg: Message = { ...base, content };
    await onEvent?.({ type: "tool", message: msg });
    return msg;
  }
}