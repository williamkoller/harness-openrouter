# Architecture

```bash
src/
  domain/
    entities/
      Message.ts
      ToolCall.ts
    value-objects/
      ToolName.ts
    repositories/
      LLMRepository.ts (interface)
    services/
      ToolRegistry.ts
      AgentService.ts (orchestration)
  application/
    use-cases/
      RunAgentUseCase.ts
  infrastructure/
    llm/
      OpenRouterLLMRepository.ts
    tools/
      ReadDirTool.ts
      ReadFileTool.ts
      WriteFileTool.ts
      ExecuteBashTool.ts
    config/
      env.ts
  presentation/
    cli.ts
index.ts
```