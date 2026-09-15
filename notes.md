# Project Notes — Harness OpenRouter

## Overview

**Harness OpenRouter** is a small, extensible coding-agent harness written in
TypeScript and run with [Bun](https://bun.sh/). It talks to the OpenRouter
Chat Completions API and implements an iterative agent loop: send messages to a
model, expose local tools via function calling, execute the requested tools, and
feed their results back to the model until it returns a final answer.

The current entry point is an **interactive REPL**, not a one-shot command.

## Tech Stack

- **Language:** TypeScript (ESM, `"type": "module"`)
- **Runtime / package manager:** Bun
- **LLM provider:** OpenRouter (`https://openrouter.ai/api/v1`)
- **Dependencies:** none at runtime; only `@types/bun` and `typescript` as dev deps

## How It Works

1. The REPL reads a line from the user.
2. Plain text is treated as a prompt; lines starting with `/` are commands.
3. `AgentService.run` loops up to `MAX_ITERATIONS` times:
   - sends conversation + tool definitions to the LLM;
   - appends the assistant message (content, optional reasoning, tool calls);
   - if there are no tool calls, the run ends;
   - otherwise each tool is executed and its output appended as a `tool` message.
4. Events (`iteration`, `assistant`, `tool`) are streamed back to the REPL for
   rendering, and the resulting history is committed to the session.

## Architecture

The code follows a lightweight Clean Architecture layout with a composition
root:

```text
src/
├── domain/
│   ├── entities/message.ts              # Conversation message types
│   ├── repositories/llm-repository.ts   # LLM abstraction (interface)
│   ├── services/agent-service.ts        # Agent orchestration loop
│   ├── services/tool-registry.ts        # Tool registry
│   └── tools/tool.ts                    # Tool contract
├── infrastructure/
│   ├── config/env.ts                    # Environment configuration
│   ├── llm/openrouter-llm-repository.ts # OpenRouter adapter
│   └── tools/*.ts                       # Local tool implementations
├── cli/
│   ├── repl.ts                          # Interactive REPL + rendering
│   ├── commands.ts                      # Slash commands
│   ├── command.ts / parse-command.ts    # Command contract + parsing
│   ├── session-state.ts                 # Conversation state
│   └── theme.ts                         # Terminal colors
└── index.ts                             # Composition root / entry point
```

The domain layer depends only on interfaces; `src/index.ts` wires the
repository, registry, tools, session, and REPL together.

## Built-in Tools

| Tool           | Capability                 | Behavior                                          |
| -------------- | -------------------------- | ------------------------------------------------- |
| `read_dir`     | Lists directory entries    | Resolves paths from the process working directory |
| `read_file`    | Reads UTF-8 files          | Truncates output after ~200 KB                    |
| `write_file`   | Writes or appends text     | Creates parent directories; can overwrite files   |
| `execute_bash` | Runs `bash -c` commands    | 30-second default timeout; returns stdout/stderr/exit code |

Tools are **not sandboxed** and resolve arbitrary local paths; the shell tool
inherits the parent environment.

## REPL Commands

| Command               | Aliases        | Description                              |
| --------------------- | -------------- | ---------------------------------------- |
| `/help`               | `?`            | List available commands                  |
| `/reasoning [level]`  | `reason`, `r`  | Show/set reasoning effort (`off`–`high`) |
| `/model [id]`         | —              | Show/set the OpenRouter model            |
| `/clear`              | —              | Clear conversation history               |
| `/tools`              | —              | List registered tools                    |
| `/history`            | —              | Show message counts by role              |
| `/exit`               | `quit`, `q`    | Exit the REPL                            |

> Note: command descriptions in `src/cli/commands.ts` are written in Portuguese.

## Configuration

Bun loads `.env` automatically at startup.

| Variable               | Required | Default                              | Description                        |
| ---------------------- | -------- | ------------------------------------ | ---------------------------------- |
| `OPENROUTER_API_KEY`   | Yes      | —                                    | OpenRouter API key                 |
| `OPENROUTER_MODEL`     | No       | `deepseek/deepseek-chat`             | Model identifier                   |
| `AGENT_SYSTEM_PROMPT`  | No       | Built-in concise coding-agent prompt | Applied to every run               |
| `MAX_ITERATIONS`       | No       | `12`                                 | Max model/tool iterations          |
| `OPENROUTER_BASE_URL`  | No       | `https://openrouter.ai/api/v1`       | OpenRouter-compatible API base URL |
| `AGENT_REASONING`      | No       | `medium`                             | Reasoning effort (`off`–`high`)    |

Never commit `.env` or leak the API key.

## Scripts

```bash
bun start        # Run the REPL (bun run src/index.ts)
bun run dev      # Run with --watch for automatic restart
bunx tsc --noEmit  # Type-check without emitting
```

## Extending

- **New tool:** implement the `Tool` interface (`src/domain/tools/tool.ts`) with
  a unique name, description, JSON Schema parameters, and an `execute` method;
  then register it in `buildTools()` in `src/index.ts`.
- **New provider:** implement the `LLMRepository` interface and inject the
  adapter when constructing `AgentService`.

## Limitations / Known Gaps

- No application-level sandbox or approval step for tool execution.
- HTTP requests define no explicit timeout or retry policy.
- Conversation history is in-memory only; nothing is persisted between runs.
- No automated tests currently exist.
- Command UI strings and README documentation are partially out of sync (the
  README describes a one-shot CLI; the code runs an interactive REPL) and the
  CLI is localized in Portuguese while the README is in English.
