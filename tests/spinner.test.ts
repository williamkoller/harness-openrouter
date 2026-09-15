import { describe, expect, test } from "bun:test";
import { Spinner } from "../src/cli/anim/spinner";

function fakeStream(isTTY = true) {
  const writes: string[] = [];
  return {
    writes,
    stream: {
      write(s: string) {
        writes.push(s);
        return true;
      },
      isTTY,
    } as unknown as NodeJS.WriteStream,
  };
}

describe("Spinner", () => {
  test("does not render when disabled", () => {
    const { stream, writes } = fakeStream();
    const s = new Spinner({ stream, enabled: false });
    s.start("thinking");
    s.stop();
    expect(writes).toHaveLength(0);
  });

  test("renders a frame on start, and clears on stop", () => {
    const { stream, writes } = fakeStream();
    const s = new Spinner({ stream, enabled: true, intervalMs: 1_000 });
    s.start("thinking");
    s.stop();
    // start writes one frame, stop writes the clear-line + newline
    expect(writes.length).toBeGreaterThanOrEqual(2);
    expect(writes[0]).toContain("thinking");
    expect(writes[writes.length - 1]).toContain("\x1b[2K");
  });

  test("update() changes the label without restarting the timer", () => {
    const { stream, writes } = fakeStream();
    const s = new Spinner({ stream, enabled: true, intervalMs: 1_000 });
    s.start("a");
    s.update("b");
    s.stop();
    expect(writes.some((w) => w.includes(" b"))).toBe(true);
  });

  test("repeated start with same text is a no-op", () => {
    const { stream, writes } = fakeStream();
    const s = new Spinner({ stream, enabled: true, intervalMs: 1_000 });
    s.start("x");
    const before = writes.length;
    s.start("x");
    expect(writes.length).toBe(before);
    s.stop();
  });
});