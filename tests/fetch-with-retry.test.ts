import { describe, expect, test } from "bun:test";
import { fetchWithRetry } from "../src/infrastructure/http/fetch-with-retry";

const noSleep = { baseDelayMs: 1, maxDelayMs: 5, timeoutMs: 200 };

function jsonResponse(status: number, body = "{}"): Response {
  return new Response(body, { status, headers: { "content-type": "application/json" } });
}

describe("fetchWithRetry", () => {
  test("does not retry on 2xx", async () => {
    let calls = 0;
    const fetchImpl = async () => { calls++; return jsonResponse(200); };

    const res = await fetchWithRetry("http://x", {}, { ...noSleep, fetchImpl });
    expect(res.status).toBe(200);
    expect(calls).toBe(1);
  });

  test("does not retry on 4xx (except 408/425/429)", async () => {
    let calls = 0;
    const fetchImpl = async () => { calls++; return jsonResponse(400); };
    await fetchWithRetry("http://x", {}, { ...noSleep, fetchImpl });
    expect(calls).toBe(1);
  });

  test("retries on 429 and eventually succeeds", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      return calls < 3 ? jsonResponse(429) : jsonResponse(200, `{"ok":true}`);
    });

    const res = await fetchWithRetry("http://x", {}, { ...noSleep, fetchImpl });
    expect(res.status).toBe(200);
    expect(calls).toBe(3);
  });

  test("retries on 5xx then gives up after maxRetries", async () => {
    let calls = 0;
    const fetchImpl = async () => { calls++; return jsonResponse(503); };

    const res = await fetchWithRetry("http://x", {}, { ...noSleep, maxRetries: 2, fetchImpl });
    expect(res.status).toBe(503);
    expect(calls).toBe(3); // initial + 2 retries
  });

  test("retries on network error then rethrows after maxRetries", async () => {
    let calls = 0;
    const fetchImpl = async () => { calls++; throw new Error("boom"); };

    await expect(
      fetchWithRetry("http://x", {}, { ...noSleep, maxRetries: 2, fetchImpl }),
    ).rejects.toThrow("boom");
    expect(calls).toBe(3);
  });

  test("aborts a slow request via timeout", async () => {
    const fetchImpl = (_input: string | URL | Request, init?: RequestInit): Promise<Response> =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        signal?.addEventListener("abort", () => reject(signal.reason ?? new Error("aborted")));
      });

    await expect(
      fetchWithRetry("http://x", {}, { fetchImpl, timeoutMs: 20, maxRetries: 0 }),
    ).rejects.toThrow(/timeout|aborted/i);
  });

  test("onRetry is called with reason and attempt", async () => {
    const events: { attempt: number; reason: string }[] = [];
    let calls = 0;
    const fetchImpl = async () => { calls++; return calls < 2 ? jsonResponse(500) : jsonResponse(200); };

    await fetchWithRetry("http://x", {}, {
      ...noSleep,
      fetchImpl,
      onRetry: (e) => events.push({ attempt: e.attempt, reason: e.reason }),
    });

    expect(events).toHaveLength(1);
    expect(events[0]!.reason).toContain("500");
  });
});