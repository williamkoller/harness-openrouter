import { Spinner } from "./spinner";
import { Typewriter } from "./type-writer";
import type { SpinnerStyle } from "./frames";

export interface AnimatorOptions {
  enabled?: boolean;
  spinnerStyle?: SpinnerStyle;
}

function detectInteractive(): boolean {
  if (process.env.HARNESS_NO_ANIM === "1") return false;
  if (process.env.CI) return false;
  if (process.env.NO_COLOR && process.env.NO_COLOR !== "0") return false;
  return Boolean(process.stdout.isTTY);
}

export class Animator {
  readonly spinner: Spinner;
  readonly typewriter: Typewriter;
  private enabled: boolean;

  constructor(opts: AnimatorOptions = {}) {
    this.enabled = opts.enabled ?? detectInteractive();
    this.spinner = new Spinner({
      style: opts.spinnerStyle ?? "braille",
      enabled: this.enabled,
    });
    this.typewriter = new Typewriter({ enabled: this.enabled });
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    this.spinner.setEnabled(v);
    this.typewriter.setEnabled(v);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  stopAll(): void {
    this.spinner.stop();
  }
}