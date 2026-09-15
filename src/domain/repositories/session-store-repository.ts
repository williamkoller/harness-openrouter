import type { Message } from "../entities/message";

export interface SessionStore {
  readonly id: string;
  append(message: Message): Promise<void>;
  loadAll(): Promise<Message[]>;
  clear(): Promise<void>;
}