import type { Message, ToolCall } from '../entities/message'

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
  toolCalls: ToolCall[]
}

export interface LLMRepository {
  chat(messages: Message[], tools: ToolDefinition[]): Promise<LLMResponse>
}