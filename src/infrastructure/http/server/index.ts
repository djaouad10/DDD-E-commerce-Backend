import type { Container } from "#/composition/container.js";
import express from "express";
import cors from "cors";
import { requestLogger } from "../middleware/request-logger-middleware.js";
import { scopeMiddleware } from "../middleware/scope-middleware.js";
import { attachUserMiddleware } from "../middleware/attach-user-middleware.js";
import { contextMiddleware } from "../middleware/context-middleware.js";
import routes from "../routes/index.js";
import { errorHandlingMiddleware } from "../middleware/error-handling-middleware.js";
export function createServer(container: Container) {
  const app = express();

  app.use(express.json());
  app.use(cors());

  app.use(requestLogger);
  app.use(scopeMiddleware(container));
  app.use(attachUserMiddleware);
  app.use(contextMiddleware);

  app.use("/api/v1", routes);

  app.use(errorHandlingMiddleware);

  return app;
}
