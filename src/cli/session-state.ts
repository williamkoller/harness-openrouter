import type { Message } from "../domain/entities/message";
import type { ReasoningEffort } from "../domain/repositories/llm-repository";
import type { SessionStore } from "../domain/repositories/session-store-repository";

export interface SessionStateInit {
  model: string;
  reasoning: ReasoningEffort;
  systemPrompt: string;
  store: SessionStore;
}

export class SessionState {
  model: string;
  reasoning: ReasoningEffort;
  systemPrompt: string;
  history: Message[] = [];

  private readonly store: SessionStore;

  constructor(init: SessionStateInit) {
    this.model = init.model;
    this.reasoning = init.reasoning;
    this.systemPrompt = init.systemPrompt;
    this.store = init.store;
  }

  get sessionId(): string { return this.store.id; }
  get sessionPath(): string { return "path" in this.store ? (this.store as any).path : this.store.id; }

  /** Load persisted history. Returns number of messages restored. */
  async load(): Promise<number> {
    this.history = await this.store.loadAll();
    return this.history.length;
  }

  async reset(): Promise<void> {
    this.history = [];
    await this.store.clear();
  }

  /** Append a message to the in-memory history and persist it. */
  async record(message: Message): Promise<void> {
    this.history.push(message);
    await this.store.append(message);
  }

  /**
   * After agent.run, the returned array equals
   * [system, ...historyAtCall, ...newMessages].
   * We persist only the newly produced messages.
   */
  async commit(returned: Message[]): Promise<void> {
    const newMessages = returned.slice(1 + this.history.length);
    for (const m of newMessages) {
      this.history.push(m);
      await this.store.append(m);
    }
  }
}