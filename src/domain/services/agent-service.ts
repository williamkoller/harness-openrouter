import type { Message } from "../entities/message";
import type {
  ChatOptions,
  LLMRepository,
  ToolDefinition,
} from "../repositories/llm-repository";
import type { ToolRegistry } from "./tool-registry";

export type AgentEvent =
  | { type: "iteration"; index: number }
  | { type: "assistant"; message: Message }
  | { type: "tool"; message: Message };

export interface AgentRunOptions {
  messages: Message[];
  maxIterations?: number;
  chatOptions?: ChatOptions;
  onEvent?: (event: AgentEvent) => void;
}

export class AgentService {
  constructor(
    private readonly llm: LLMRepository,
    private readonly tools: ToolRegistry,
  ) {}

  async run(opts: AgentRunOptions): Promise<Message[]> {
    const {
      messages,
      maxIterations = 12,
      chatOptions,
      onEvent,
    } = opts;

    for (let i = 0; i < maxIterations; i++) {
      onEvent?.({ type: "iteration", index: i });

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
      onEvent?.({ type: "assistant", message: assistantMsg });

      if (response.toolCalls.length === 0) return messages;

      for (const call of response.toolCalls) {
        const tool = this.tools.get(call.function.name);
        let result: string;

        if (!tool) {
          result = `Error: tool "${call.function.name}" not found`;
        } else {
          try {
            const args = call.function.arguments
              ? (JSON.parse(call.function.arguments) as Record<string, unknown>)
              : {};
            result = await tool.execute(args);
          } catch (err) {
            result = `Error: ${(err as Error).message}`;
          }
        }

        const toolMsg: Message = {
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: result,
        };
        messages.push(toolMsg);
        onEvent?.({ type: "tool", message: toolMsg });
      }
    }

    return messages;
  }
}