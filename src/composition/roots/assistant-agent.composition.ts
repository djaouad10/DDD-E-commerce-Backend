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
import { BetterAuthAdapter } from "#/infrastructure/auth/better-auth.adapter.js";
import type { BetterAuthConfig } from "#/infrastructure/config/auth.js";
import { createDrizzleDB } from "#/infrastructure/config/database.js";
import { agentEnv } from "#/infrastructure/config/env/env.agent.js";
import { PostgresUserRepository } from "#/infrastructure/databases/repositories/postgres/postgres-user-repository.js";
import { createMcpClient } from "#/infrastructure/mcp/client.js";
import {
  McpClientGatwayAdapter,
  type McpClientGatewayConfig,
} from "#/infrastructure/mcp/mcp-client-gatway.adapter.js";
import { Container } from "../utils/container.js";
import {
  ASSISTANT_AGENT,
  AUTH,
  CHAT_MODEL_PORT,
  DRIZZLE_DB,
  GEMENI_CLIENT,
  MCP_CLIENT,
  MCP_CLIENT_GATEWAY,
  RUN_ASSISTANT_AGENT_SERVICE,
  USER_REPOSITORY,
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

  const db = createDrizzleDB({
    connectionUrl: agentEnv.DATABASE_URL,
    maxPoolSize: 10,
    debug: agentEnv.DEBUG_DB,
  });

  container.registerInstance(DRIZZLE_DB, db);

  const betteAuthConfig: BetterAuthConfig = {
    GOOGLE_CLIENT_ID: agentEnv.GOOGLE_CLIENT_ID,
    BETTER_AUTH_URL: agentEnv.BETTER_AUTH_URL,
    GOOGLE_CLIENT_SECRET: agentEnv.GOOGLE_CLIENT_SECRET,
    NODE_ENV: agentEnv.NODE_ENV,
  };

  container.register(
    AUTH,
    (scope) =>
      new BetterAuthAdapter(
        scope.resolve(DRIZZLE_DB),
        scope.resolve(USER_REPOSITORY),
        betteAuthConfig,
      ),
    "singleton",
  );

  container.register(
    USER_REPOSITORY,
    (scope) => new PostgresUserRepository(scope.resolve(DRIZZLE_DB)),
    "singleton",
  );

  container.register(
    RUN_ASSISTANT_AGENT_SERVICE,
    (scope) => new RunAssistantAgentService(scope.resolve(ASSISTANT_AGENT)),
    "scoped",
  );

  return container;
}
