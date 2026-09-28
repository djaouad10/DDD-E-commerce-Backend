import type { Container } from "#/composition/utils/container.js";
import express from "express";
import cors from "cors";
import { requestLogger } from "../middleware/request-logger-middleware.js";
import { scopeMiddleware } from "../middleware/scope-middleware.js";
import { attachUserMiddleware } from "../middleware/attach-user-middleware.js";
import { contextMiddleware } from "../middleware/context-middleware.js";
import { errorHandlingMiddleware } from "../middleware/error-handling-middleware.js";
import { requestTimerMiddleware } from "../middleware/request-timer-middleware.js";
import { validate } from "../utils/validation.js";
import { assistantAgentChatBodySchema } from "../validators/assistant-agent.js";
import { authMiddleware } from "../middleware/auth-middleware.js";
import { RUN_ASSISTANT_AGENT_SERVICE } from "#/composition/utils/tokens.js";
import { RunAssistantAgentQuery } from "#/application/queries/run-assistant-agent.query.js";

export function createAssistantAgentServer(container: Container) {
  const app = express();

  app.use(express.json());
  app.use(cors());

  app.use(requestTimerMiddleware);
  app.use(scopeMiddleware(container));
  app.use(attachUserMiddleware);
  app.use(contextMiddleware);
  app.use(requestLogger);

  app.post("/api/assistant-agent/chat", authMiddleware, async (req, res) => {
    const safeBody = validate(assistantAgentChatBodySchema, req.body);

    const service = req.scope.resolve(RUN_ASSISTANT_AGENT_SERVICE);
    const query = new RunAssistantAgentQuery(safeBody.query);

    const { response } = await service.execute(query);

    res.status(200).json({ response });
  });

  app.use(errorHandlingMiddleware);

  return app;
}
