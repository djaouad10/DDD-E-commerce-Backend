import { buildMcpContainer } from "#/composition/roots/mcp.composition.js";
import { mcpEnv } from "#/infrastructure/config/env/mcp.js";
import { createMcpTransport } from "#/infrastructure/mcp/transport.js";

function bootstrap() {
  const container = buildMcpContainer();
  const app = createMcpTransport(container);

  const port = mcpEnv.MCP_PORT || 8000;

  app.listen(port, () => console.log(`MCP server is running on port ${port}`));
}

bootstrap();
