import type { Container } from "#/composition/utils/container.js";
import express from "express";
import { requireMcpApiKey } from "./middleware/require-mcp-key.middleware.js";
import { mcpEnv } from "../config/env/env.mcp.js";
import { createMcpServer } from "./server.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { requestTimerMiddleware } from "../http/middleware/request-timer-middleware.js";
import { contextMiddleware } from "../http/middleware/context-middleware.js";
import { requestLogger } from "../http/middleware/request-logger-middleware.js";
import { errorHandlingMiddleware } from "../http/middleware/error-handling-middleware.js";
import { scopeMiddleware } from "../http/middleware/scope-middleware.js";

export function createMcpTransport(container: Container): express.Express {
  const app = express();
  app.use(requestTimerMiddleware);
  app.use(scopeMiddleware(container));
  app.use(contextMiddleware);
  app.use(requestLogger);

  app.post(
    "/mcp",
    requireMcpApiKey(mcpEnv.MCP_API_KEY),
    express.json(),
    async (req, res) => {
      const scope = req.scope;
      const mcpServer = createMcpServer(scope);

      const transport = new StreamableHTTPServerTransport({
        enableJsonResponse: true,
      });

      try {
        await mcpServer.connect(transport as Transport);

        await transport.handleRequest(req, res, req.body);
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

  app.use(errorHandlingMiddleware);

  return app;
}
