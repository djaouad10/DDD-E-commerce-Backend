import {
  AssistantAgent,
  type AssistantAgentConfig,
} from "#/application/ai/agents/assistant-agent.js";
import { buildAssistantAgentSystemPrompt } from "#/application/ai/prompts/assistant-system-prompt.js";
import { RunAssistantAgentService } from "#/application/services/assistant-agent/run-assistant-agent.service.js";
import {
  GemeniChatModelAdapter,
  type GemeniChatModelAdapterConfig,
} from "#/infrastructure/ai/adapters/gemeni-chat-model.adapter.js";
import { createGemeniClient } from "#/infrastructure/ai/clients/gemeni-client.js";
import { agentEnv } from "#/infrastructure/config/env/env.agent.js";
import { createMcpClient } from "#/infrastructure/mcp/client.js";
import {
  McpClientGatwayAdapter,
  type McpClientGatewayConfig,
} from "#/infrastructure/mcp/mcp-client-gatway.adapter.js";
import { Container } from "../utils/container.js";
import {
  ASSISTANT_AGENT,
  CHAT_MODEL_PORT,
  GEMENI_CLIENT,
  MCP_CLIENT,
  MCP_CLIENT_GATEWAY,
  RUN_ASSISTANT_AGENT_SERVICE,
} from "../utils/tokens.js";

export function buildAssistantAgentContainer(): Container {
  const container = new Container();

  const mcpClient = createMcpClient({
    clientName: "assistant-agent",
    version: "1.0.0",
  });

  container.registerInstance(MCP_CLIENT, mcpClient);

  const mcpClientGatwayAdapterConfig: McpClientGatewayConfig = {
    API_KEY: agentEnv.MCP_API_KEY,
    SERVER_URL: agentEnv.MCP_SERVER_URL,
  };

  container.register(
    MCP_CLIENT_GATEWAY,
    (scope) =>
      new McpClientGatwayAdapter(
        scope.resolve(MCP_CLIENT),
        mcpClientGatwayAdapterConfig,
      ),
    "singleton", // must be singleton so MCP tools are cached across requests
  );

  const gemeniClient = createGemeniClient({ API_KEY: agentEnv.GEMINI_API_KEY });

  container.registerInstance(GEMENI_CLIENT, gemeniClient);

  const gemeniChatModelConfig: GemeniChatModelAdapterConfig = {
    GEMENI_CHAT_MODEL: agentEnv.GEMINI_CHAT_MODEL,
  };

  container.register(
    CHAT_MODEL_PORT,
    (scope) =>
      new GemeniChatModelAdapter(
        scope.resolve(GEMENI_CLIENT),
        gemeniChatModelConfig,
      ),
    "singleton",
  );

  const assistantAgentConfig: AssistantAgentConfig = {
    maxSteps: agentEnv.ASSISTANT_MAX_STEPS,
  };

  container.register(
    ASSISTANT_AGENT,
    (scope) =>
      new AssistantAgent(
        scope.resolve(MCP_CLIENT_GATEWAY),
        scope.resolve(CHAT_MODEL_PORT),
        buildAssistantAgentSystemPrompt({ storeName: agentEnv.STORE_NAME }),
        assistantAgentConfig,
      ),
    "scoped", // can be singleton since it doesn't contain any internal state, but I will keep it scoped for safety in case of future changes
  );

  container.register(
    RUN_ASSISTANT_AGENT_SERVICE,
    (scope) => new RunAssistantAgentService(scope.resolve(ASSISTANT_AGENT)),
    "scoped",
  );

  return container;
}
