import { buildAssistantAgentContainer } from "#/composition/roots/assistant-agent.composition.js";
import { MCP_CLIENT_GATEWAY } from "#/composition/utils/tokens.js";
import { agentEnv } from "#/infrastructure/config/env/env.agent.js";
import { createAssistantAgentServer } from "#/infrastructure/http/server/assistant-agent.server.js";

async function bootStrap() {
  const container = buildAssistantAgentContainer();

  const mcpClientGateway = container.resolveSingleton(MCP_CLIENT_GATEWAY);

  // load mcp tools at startup
  await mcpClientGateway.loadTools();

  const server = createAssistantAgentServer(container);

  const port = agentEnv.PORT || 8080;

  server.listen(port, () => {
    console.log(`Assistant Agent Server is running on port ${port}`);
  });
}

bootStrap().catch((e) => console.error(e));
