import type {
  ChatOptions,
  LLMRepository,
  LLMResponse,
  ToolDefinition,
} from "../../domain/repositories/llm-repository";
import type { Message } from "../../domain/entities/message";

interface OpenRouterChoice {
  message: {
    role: "assistant";
    content: string | null;
    reasoning?: string | null;
    reasoning_content?: string | null;
    tool_calls?: LLMResponse["toolCalls"];
  };
}

interface OpenRouterChatResponse {
  choices: OpenRouterChoice[];
}

export class OpenRouterLLMRepository implements LLMRepository {
  constructor(
    private readonly apiKey: string,
    private model: string,
    private readonly baseUrl: string = "https://openrouter.ai/api/v1",
  ) {}

  setModel(model: string) {
    this.model = model;
  }

  getModel() {
    return this.model;
  }

  async chat(
    messages: Message[],
    tools: ToolDefinition[],
    options: ChatOptions = {},
  ): Promise<LLMResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
    };
    if (tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }
    if (options.reasoning && options.reasoning !== "off") {
      body.reasoning = { effort: options.reasoning };
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "harness",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as OpenRouterChatResponse;
    const choice = data.choices?.[0];
    if (!choice) throw new Error("OpenRouter: empty choices");

    return {
      content: choice.message.content ?? null,
      reasoning:
        choice.message.reasoning ?? choice.message.reasoning_content ?? null,
      toolCalls: choice.message.tool_calls ?? [],
    };
  }
}