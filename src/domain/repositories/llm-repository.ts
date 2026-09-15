import type { Message, ToolCall } from '../entities/message'

export type ReasoningEffort = "off" | "low" | "medium" | "high";

export interface ChatOptions {
  reasoning?: ReasoningEffort;
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface LLMResponse {
  content: string | null
  reasoning: string | null;
  toolCalls: ToolCall[]
}

export interface LLMRepository {
  chat(
    messages: Message[],
    tools: ToolDefinition[],
    options?: ChatOptions,
  ): Promise<LLMResponse>;
}