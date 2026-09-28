import type { Scope } from "#/composition/utils/container.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { productSemanticSearchToolRegistration } from "./tools/product-semantic-search.tool.js";
import { getProductFullDetailsToolRegistration } from "./tools/product-full-details.tool.js";

export function createMcpServer(scope: Scope): McpServer {
  const server = new McpServer({
    name: "ecommerce-assistant",
    version: "1.0.0",
  });

  productSemanticSearchToolRegistration(scope, server);

  getProductFullDetailsToolRegistration(scope, server);

  return server;
}
