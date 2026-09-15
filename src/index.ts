import { AgentService } from "./domain/services/agent-service";
import { ToolRegistry } from "./domain/services/tool-registry";
import { env } from "./infrastructure/config/env";
import { OpenRouterLLMRepository } from "./infrastructure/llm/openrouter-llm-repository";
import { ExecuteBashTool } from "./infrastructure/tools/execute-bash-tool";
import { ReadDirTool } from "./infrastructure/tools/read-dir-tool";
import { ReadFileTool } from "./infrastructure/tools/read-file-tool";
import { WriteFileTool } from "./infrastructure/tools/write-file-tool";
import type { Message } from "./domain/entities/message";

function buildTools(): ToolRegistry {
  return new ToolRegistry()
    .register(new ReadDirTool())
    .register(new ReadFileTool())
    .register(new WriteFileTool())
    .register(new ExecuteBashTool());
}

async function main() {
  const args = Bun.argv.slice(2);
  const prompt = args.join(" ").trim();

  if (!prompt) {
    console.error("Usage: bun start \"<prompt>\"");
    process.exit(1);
  }

  const llm = new OpenRouterLLMRepository(env.openRouterApiKey, env.model, env.baseUrl);
  const tools = buildTools();
  const agent = new AgentService(llm, tools);

  console.log(`→ model: ${env.model}\n`);

  const history: Message[] = [];

  const messages = await agent.run({
    userInput: prompt,
    systemPrompt: env.systemPrompt,
    maxIterations: env.maxIterations,
    history,
    onEvent: (event) => {
      switch (event.type) {
        case "iteration":
          console.log(`\n--- iteration ${event.index + 1} ---`);
          break;

        case "assistant": {
          const m = event.message;
          if (m.content) console.log(`assistant: ${m.content}`);
          for (const call of m.tool_calls ?? []) {
            console.log(
              `  → tool_call: ${call.function.name}(${call.function.arguments})`,
            );
          }
          break;
        }

        case "tool": {
          const preview =
            (event.message.content ?? "").split("\n").slice(0, 6).join("\n") +
            ((event.message.content ?? "").split("\n").length > 6 ? "\n  ..." : "");
          console.log(`  ← tool_result [${event.message.name}]:\n${preview}`);
          break;
        }
      }
    },
  });

  const final = messages[messages.length - 1];
  console.log("\n=== FINAL ===");
  console.log(final?.content ?? "(no content)");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});