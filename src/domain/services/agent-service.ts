import type { Message } from '../../domain/entities/message'
import type {
  LLMRepository
} from '../../domain/repositories/llm-repository'
import type { ToolRegistry } from './tool-registry'

export type AgentEvent =
  | { type: "assistant"; message: Message }
  | { type: "tool"; message: Message }
  | { type: "iteration"; index: number };

export interface AgentRunOptions {
  userInput: string;
  systemPrompt: string;
  maxIterations?: number;
  onEvent?: (event: AgentEvent) => void;
  /** Histórico prévio (sem system), útil para multi-turn */
  history?: Message[];
}

export class AgentService {
  constructor(
    private readonly llm: LLMRepository,
    private readonly tools: ToolRegistry,
  ) {}

  async run(opts: AgentRunOptions): Promise<Message[]> {
    const {
      userInput,
      systemPrompt,
      maxIterations = 12,
      onEvent,
      history = [],
    } = opts;

    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userInput },
    ];

    for (let i = 0; i < maxIterations; i++) {
      onEvent?.({ type: "iteration", index: i });

      const response = await this.llm.chat(messages, this.tools.definitions());

      const assistantMsg: Message = {
        role: "assistant",
        content: response.content,
        ...(response.toolCalls.length > 0 && { tool_calls: response.toolCalls }),
      };
      messages.push(assistantMsg);
      onEvent?.({ type: "assistant", message: assistantMsg });

      if (response.toolCalls.length === 0) {
        return messages;
      }

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