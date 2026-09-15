import type { Message } from "../domain/entities/message";
import type { ReasoningEffort } from "../domain/repositories/llm-repository";

export class SessionState {
  model: string;
  reasoning: ReasoningEffort;
  history: Message[] = [];
  systemPrompt: string;

  constructor(init: {
    model: string;
    reasoning: ReasoningEffort;
    systemPrompt: string;
  }) {
    this.model = init.model;
    this.reasoning = init.reasoning;
    this.systemPrompt = init.systemPrompt;
  }

  /** Mensagens prontas para enviar à LLM (system + histórico + input novo). */
  buildMessages(userInput: string): Message[] {
    return [
      { role: "system", content: this.systemPrompt },
      ...this.history,
      { role: "user", content: userInput },
    ];
  }

  /** Após o run, o array retornado começa com system → descartamos index 0. */
  commitHistory(returnedMessages: Message[]) {
    this.history = returnedMessages.slice(1);
  }

  clear() {
    this.history = [];
  }
}