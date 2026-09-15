export type FetchFunction = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface RetryOptions {
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  fetchImpl?: FetchFunction;
  onRetry?: (info: { attempt: number; delayMs: number; reason: string }) => void;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export async function fetchWithRetry(
  input: string | URL | Request,
  init: RequestInit = {},
  options: RetryOptions = {},
): Promise<Response> {
  const {
    timeoutMs = 60_000,
    maxRetries = 3,
    baseDelayMs = 500,
    maxDelayMs = 8_000,
    fetchImpl = fetch,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error("request timeout")), timeoutMs);
    const external = init.signal;
    if (external) {
      if (external.aborted) controller.abort(external.reason);
      else external.addEventListener("abort", () => controller.abort(external.reason), { once: true });
    }

    try {
      const res = await fetchImpl(input, { ...init, signal: controller.signal });
      clearTimeout(timer);

      if (!RETRYABLE_STATUS.has(res.status)) return res;
      if (attempt === maxRetries) return res;

      const retryAfterMs = parseRetryAfter(res.headers.get("retry-after"));
      const delay = retryAfterMs ?? backoff(attempt, baseDelayMs, maxDelayMs);
      onRetry?.({ attempt, delayMs: delay, reason: `HTTP ${res.status}` });
      await sleep(delay);
    } catch (err) {
      clearTimeout(timer);
      lastError = err;

      if (external?.aborted) throw err;
      if (attempt === maxRetries) throw err;

      const delay = backoff(attempt, baseDelayMs, maxDelayMs);
      onRetry?.({
        attempt,
        delayMs: delay,
        reason: err instanceof Error ? err.message : String(err),
      });
      await sleep(delay);
    }
  }

  throw lastError ?? new Error("fetchWithRetry: exhausted retries");
}

function backoff(attempt: number, base: number, max: number): number {
  const exp = Math.min(max, base * 2 ** attempt);
  return Math.min(max, exp + Math.random() * base);
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));