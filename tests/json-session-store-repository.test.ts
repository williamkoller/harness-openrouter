import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonlSessionStore } from "../src/infrastructure/persistence/json-session-store";
import type { Message } from "../src/domain/entities/message";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "harness-test-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("JsonlSessionStore", () => {
  test("round-trips messages", async () => {
    const store = new JsonlSessionStore({ dir, id: "s1" });
    const msgs: Message[] = [
      { role: "user", content: "hi" },
      { role: "assistant", content: null, tool_calls: [{ id: "c", type: "function", function: { name: "t", arguments: "{}" } }] },
      { role: "tool", tool_call_id: "c", name: "t", content: "ok" },
    ];
    for (const m of msgs) await store.append(m);

    const reloaded = new JsonlSessionStore({ dir, id: "s1" }).loadAll();
    expect(await reloaded).toEqual(msgs);
  });

  test("returns [] when the file does not exist", async () => {
    const store = new JsonlSessionStore({ dir, id: "missing" });
    expect(await store.loadAll()).toEqual([]);
  });

  test("clear() removes the file", async () => {
    const store = new JsonlSessionStore({ dir, id: "s1" });
    await store.append({ role: "user", content: "x" });
    await store.clear();
    expect(await store.loadAll()).toEqual([]);
  });

  test("skips malformed lines on load", async () => {
    const store = new JsonlSessionStore({ dir, id: "s1" });
    await store.append({ role: "user", content: "valid" });
    // Inject a bad line manually
    const { appendFile } = await import("node:fs/promises");
    await appendFile(store.path, "this is not json\n", "utf8");
    const loaded = await store.loadAll();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.content).toBe("valid");
  });

  test("concurrent appends are serialized in order", async () => {
    const store = new JsonlSessionStore({ dir, id: "s1" });
    await Promise.all([
      store.append({ role: "user", content: "1" }),
      store.append({ role: "user", content: "2" }),
      store.append({ role: "user", content: "3" }),
    ]);
    const loaded = await store.loadAll();
    expect(loaded.map((m) => m.content)).toEqual(["1", "2", "3"]);
  });
});