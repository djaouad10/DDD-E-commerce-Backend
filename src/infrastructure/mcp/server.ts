import type { Scope } from "#/composition/utils/container.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { productSemanticSearchToolRegistration } from "./tools/product-semantic-search.tool.js";
import { getProductStaticDataToolRegistration } from "./tools/product-static-data.tool.js";

export function createMcpServer(scope: Scope): McpServer {
  const server = new McpServer({
    name: "ecommerce-assistant",
    version: "1.0.0",
  });

  productSemanticSearchToolRegistration(scope, server);

  getProductStaticDataToolRegistration(scope, server);

  return server;
}
