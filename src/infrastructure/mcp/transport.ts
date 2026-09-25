import type { Container } from "#/composition/utils/container.js";
import express from "express";
import { requireMcpApiKey } from "./middleware/require-mcp-key.middleware.js";
import { mcpEnv } from "../config/env/mcp.js";
import { createMcpServer } from "./server.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

export function createMcpTransport(container: Container): express.Express {
  const app = express();

  app.post(
    "/mcp",
    requireMcpApiKey(mcpEnv.MCP_API_KEY),
    express.json(),
    async (req, res) => {
      const scope = container.createScope();
      const mcpServer = createMcpServer(scope);

      const transport = new StreamableHTTPServerTransport({
        enableJsonResponse: true,
      });

      try {
        await mcpServer.connect(transport as Transport);

        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error("MCP request failed", error);

        if (!res.headersSent) {
          res.status(500).json({
            error: "Internal MCP server error",
          });
        }
      } finally {
        // we use a nested try-finally to ensure that all clean up steps are executed even if one of them fails
        try {
          await transport.close();
        } finally {
          try {
            await mcpServer.close();
          } finally {
            await scope.dispose();
          }
        }
      }
    },
  );

  return app;
}
