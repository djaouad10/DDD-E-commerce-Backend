import type { Container } from "#/composition/utils/container.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { productSemanticSearchToolRegistration } from "./tools/product-semantic-search.tool.js";
import { getProductStaticDataToolRegistration } from "./tools/product-static-data.tool.js";

export function createMcpServer(container: Container): McpServer {
  const server = new McpServer({
    name: "ecommerce-assistant",
    version: "1.0.0",
  });

  productSemanticSearchToolRegistration(container, server);

  getProductStaticDataToolRegistration(container, server);

  return server;
}
