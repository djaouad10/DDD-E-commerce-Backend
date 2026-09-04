import type { Container } from "#/composition/utils/container.js";
import express from "express";
import cors from "cors";
import { requestLogger } from "../middleware/request-logger-middleware.js";
import { scopeMiddleware } from "../middleware/scope-middleware.js";
import { attachUserMiddleware } from "../middleware/attach-user-middleware.js";
import { contextMiddleware } from "../middleware/context-middleware.js";
import routes from "../routes/index.js";
import { errorHandlingMiddleware } from "../middleware/error-handling-middleware.js";
import { requestTimerMiddleware } from "../middleware/request-timer-middleware.js";
import { toNodeHandler } from "better-auth/node";
import { AUTH } from "#/composition/utils/tokens.js";
import { createRouteHandler } from "uploadthing/express";
import { createUploadThingFileRouter } from "#/infrastructure/upload/uploadthing.js";
import { env } from "#/infrastructure/config/env.js";
export async function createServer(container: Container) {
  const app = express();

  app.use(express.json());
  app.use(cors());

  const auth = await container.resolveSingleton(AUTH);
  app.all("/api/auth/*splat", toNodeHandler(auth));


  app.use(
  "/api/uploadthing",
  createRouteHandler({
    router: createUploadThingFileRouter(container.resolveSingleton(AUTH)),
    config: {
      token: env.UPLOADTHING_TOKEN,
    },
  }),
);

  app.use(requestTimerMiddleware);
  app.use(scopeMiddleware(container));
  app.use(attachUserMiddleware);
  app.use(contextMiddleware);
  app.use(requestLogger);

  app.use("/api/v1", routes);

  app.use(errorHandlingMiddleware);

  return app;
}
