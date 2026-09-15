import type { AgentEvent } from "../domain/services/agent-service";
import type { Animator } from "./anim/animator";
import { paint } from "./theme";

export interface Renderer {
  render(event: AgentEvent): Promise<void>;
}

export function createRenderer(anim: Animator): Renderer {
  return {
    async render(event) {
      switch (event.type) {
        case "llm-start":
          anim.spinner.start("thinking…");
          return;

        case "iteration":
          return;

        case "assistant": {
          anim.spinner.stop();
          const m = event.message;

          if (m.reasoning) renderReasoning(m.reasoning);

          if (m.content) {
            process.stdout.write(`${paint.green("◆")} `);
            await anim.typewriter.write(m.content);
            process.stdout.write("\n");
          }

          for (const call of m.tool_calls ?? []) {
            const preview = truncate(call.function.arguments ?? "", 160);
            console.log(
              `${paint.magenta("→")} ${paint.bold(call.function.name)} ${paint.gray(preview)}`,
            );
          }
          return;
        }

        case "tool-start":
          anim.spinner.start(`running ${event.name}…`);
          return;

        case "tool": {
          anim.spinner.stop();
          const name = event.message.name ?? "tool";
          const content = event.message.content ?? "";
          const preview = truncate(content.replace(/\n+/g, " ⏎ "), 200);
          console.log(`${paint.gray("←")} ${paint.dim(`[${name}]`)} ${preview}`);
          return;
        }

        case "tool-denied":
          anim.spinner.stop();
          console.log(`${paint.red("⊘")} ${paint.bold(event.name)} ${paint.red(event.reason)}`);
          return;
      }
    },
  };
}

function renderReasoning(text: string): void {
  console.log(paint.italic(paint.gray("🧠 reasoning:")));
  for (const line of text.trim().split("\n")) {
    console.log(paint.italic(paint.gray(`  ${line}`)));
  }
}

export function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n) + "…";
}