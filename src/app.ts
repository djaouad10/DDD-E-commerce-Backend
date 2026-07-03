import express from "express";
import { contextMiddleware } from "./infrastructure/http/middleware/context-middleware.js";
import { requestLogger } from "./infrastructure/http/middleware/request-logger-middleware.js";
import { createLogger } from "./shared/logging/logger.js";

const app = express();

app.use(express.json());

app.use(contextMiddleware);

app.use(requestLogger(createLogger("HTTP Logger")));

app.use("/health", (_, res) => {
  res.json({ status: "ok" });
});

export { app };
