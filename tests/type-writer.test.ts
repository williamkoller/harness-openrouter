import { describe, expect, test } from "bun:test";
import { Typewriter } from "../src/cli/anim/type-writer";

function fakeStream(isTTY: boolean) {
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

describe("Typewriter", () => {
  test("passes through when disabled", async () => {
    const { stream, writes } = fakeStream(true);
    const tw = new Typewriter({ stream, enabled: false });
    await tw.write("hello world");
    expect(writes.join("")).toBe("hello world");
    expect(writes).toHaveLength(1);
  });

  test("passes through when not a TTY", async () => {
    const { stream, writes } = fakeStream(false);
    const tw = new Typewriter({ stream, enabled: true });
    await tw.write("hello");
    expect(writes).toHaveLength(1);
    expect(writes[0]).toBe("hello");
  });

  test("chunks when enabled and TTY", async () => {
    const { stream, writes } = fakeStream(true);
    const tw = new Typewriter({ stream, enabled: true, delayMs: 1, maxDurationMs: 10 });
    await tw.write("abcdefghijklmnopqrstuvwxyz");
    expect(writes.length).toBeGreaterThan(1);
    expect(writes.join("")).toBe("abcdefghijklmnopqrstuvwxyz");
  });

  test("preserves astral codepoints when chunking", async () => {
    const { stream, writes } = fakeStream(true);
    const tw = new Typewriter({ stream, enabled: true, delayMs: 1, maxDurationMs: 5 });
    await tw.write("a😀b😀c");
    expect(writes.join("")).toBe("a😀b😀c");
  });

  test("empty input writes nothing", async () => {
    const { stream, writes } = fakeStream(true);
    const tw = new Typewriter({ stream, enabled: true });
    await tw.write("");
    expect(writes).toHaveLength(0);
  });
});