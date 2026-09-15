import { SPINNER_FRAMES, type SpinnerStyle } from "./frames";

export interface SpinnerOptions {
  style?: SpinnerStyle;
  intervalMs?: number;
  stream?: NodeJS.WriteStream;
  enabled?: boolean;
}

const CLEAR_LINE = "\x1b[2K\r";

export class Spinner {
  private readonly frames: readonly string[];
  private readonly intervalMs: number;
  private readonly stream: NodeJS.WriteStream;
  private enabled: boolean;

  private timer: ReturnType<typeof setInterval> | null = null;
  private frameIndex = 0;
  private text = "";
  private active = false;

  constructor(opts: SpinnerOptions = {}) {
    this.frames = SPINNER_FRAMES[opts.style ?? "braille"];
    this.intervalMs = opts.intervalMs ?? 80;
    // stdout keeps ordering with console.log. We only enable on a TTY
    // so redirected output never contains escape sequences.
    this.stream = opts.stream ?? process.stdout;
    this.enabled = opts.enabled ?? Boolean(this.stream.isTTY);
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    if (!v) this.stop();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  start(text = ""): this {
    if (!this.enabled) return this;
    this.text = text;
    if (this.active) return this; // already spinning, just updated the label

    this.active = true;
    this.frameIndex = 0;
    this.render();
    this.timer = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      this.render();
    }, this.intervalMs);
    return this;
  }

  update(text: string): this {
    this.text = text;
    if (this.active) this.render();
    return this;
  }

  /** Clear the spinner line and (optionally) print a final message. */
  stop(message?: string): this {
    if (!this.active) {
      if (message) this.stream.write(message + "\n");
      return this;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.active = false;
    this.stream.write(CLEAR_LINE);
    if (message) this.stream.write(message + "\n");
    return this;
  }

  private render(): void {
    const frame = this.frames[this.frameIndex % this.frames.length];
    const suffix = this.text ? ` ${this.text}` : "";
    this.stream.write(`${CLEAR_LINE}${frame}${suffix}`);
  }
}