function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

export const env = {
  openRouterApiKey: required("OPENROUTER_API_KEY"),
  model: process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-chat",
  systemPrompt:
    process.env.AGENT_SYSTEM_PROMPT ??
    "You are a helpful coding agent. Use tools when useful. Be concise.",
  maxIterations: Number(process.env.MAX_ITERATIONS ?? 12),
  baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
} as const;