export interface TypewriterOptions {
  /** Per-tick delay. */
  delayMs?: number;
  /** Upper bound for the whole animation, so long messages stay snappy. */
  maxDurationMs?: number;
  stream?: NodeJS.WriteStream;
  enabled?: boolean;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class Typewriter {
  private readonly delayMs: number;
  private readonly maxDurationMs: number;
  private readonly stream: NodeJS.WriteStream;
  private enabled: boolean;

  constructor(opts: TypewriterOptions = {}) {
    this.delayMs = opts.delayMs ?? 8;
    this.maxDurationMs = opts.maxDurationMs ?? 1200;
    this.stream = opts.stream ?? process.stdout;
    this.enabled = opts.enabled ?? Boolean(this.stream.isTTY);
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async write(text: string): Promise<void> {
  if (text.length === 0) return;

  if (!this.enabled || !this.stream.isTTY) {
    this.stream.write(text);
    return;
  }

  // Split by codepoint so we never chop a surrogate pair.
  const cps = [...text];
  const ticks = Math.max(1, Math.floor(this.maxDurationMs / this.delayMs));
  const chunkSize = Math.max(1, Math.ceil(cps.length / ticks));

  for (let i = 0; i < cps.length; i += chunkSize) {
    this.stream.write(cps.slice(i, i + chunkSize).join(""));
    await sleep(this.delayMs);
  }
}
}