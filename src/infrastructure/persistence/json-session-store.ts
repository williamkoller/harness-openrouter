import { appendFile, mkdir, readFile, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { SessionStore } from "../../domain/repositories/session-store-repository";
import type { Message } from "../../domain/entities/message";

export interface JsonlSessionStoreOptions {
  dir?: string;
  id?: string;
}

export function defaultSessionDir(cwd = process.cwd()): string {
  return process.env.HARNESS_SESSION_DIR ?? join(cwd, ".harness", "sessions");
}

export function newSessionId(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${stamp}-${Math.random().toString(36).slice(2, 8)}`;
}

export class JsonlSessionStore implements SessionStore {
  readonly id: string;
  private readonly filePath: string;
  private queue: Promise<void> = Promise.resolve();

  constructor(opts: JsonlSessionStoreOptions = {}) {
    const dir = opts.dir ?? defaultSessionDir();
    this.id = opts.id ?? newSessionId();
    this.filePath = join(dir, `${this.id}.jsonl`);
  }

  async append(message: Message): Promise<void> {
    this.queue = this.queue.then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true });
      await appendFile(this.filePath, JSON.stringify(message) + "\n", "utf8");
    });
    return this.queue;
  }

  async loadAll(): Promise<Message[]> {
    try { await stat(this.filePath); } catch { return []; }
    const text = await readFile(this.filePath, "utf8");
    const out: Message[] = [];
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      try { out.push(JSON.parse(t) as Message); } catch { /* skip malformed */ }
    }
    return out;
  }

  async clear(): Promise<void> {
    this.queue = this.queue.then(async () => { await rm(this.filePath, { force: true }); });
    return this.queue;
  }

  get path(): string { return this.filePath; }
}