function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

function num(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  openRouterApiKey: required("OPENROUTER_API_KEY"),
  model: process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-chat",
  systemPrompt:
    process.env.AGENT_SYSTEM_PROMPT ??
    "You are a helpful coding agent. Use tools when useful. Be concise.",
  maxIterations: num("MAX_ITERATIONS", 12),
  baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  reasoning: (process.env.AGENT_REASONING ?? "medium") as "off" | "low" | "medium" | "high",
  sandboxMode: (process.env.SANDBOX_MODE ?? "ask") as "auto" | "ask" | "read-only" | "deny-write",
  httpTimeoutMs: num("HTTP_TIMEOUT_MS", 60_000),
  httpMaxRetries: num("HTTP_MAX_RETRIES", 3),
  sessionDir: process.env.HARNESS_SESSION_DIR,
} as const;