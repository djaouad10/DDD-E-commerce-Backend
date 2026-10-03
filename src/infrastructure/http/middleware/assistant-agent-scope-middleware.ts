import type { Container } from "#/composition/utils/container.js";
import { MCP_CLIENT_GATEWAY } from "#/composition/utils/tokens.js";
import type { NextFunction, Response, Request } from "express";

export function AssistantAgentScopeMiddleware(container: Container) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.scope = container.createScope();

    res.on("finish", async () => {
      const mcpClientGateway = req.scope.resolve(MCP_CLIENT_GATEWAY);

      await mcpClientGateway.close();
      req.scope.dispose().catch(console.error);
    });

    return next();
  };
}
