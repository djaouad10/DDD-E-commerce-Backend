import { getRequestId } from "#/shared/context/request-context.js";
import type { Logger } from "#/shared/logging/logger.js";
import type { Request, Response, NextFunction } from "express";
import { performance } from "perf_hooks";


// must be executed after the context-middlware
export function requestLogger(logger: Logger) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();

    const requestId = getRequestId();

    logger.info("Request started", {
      requestId,
      method: req.method,
      path: req.path,
      query: req.query,
    });

    try {
      res.on("finish", () => {
        const duration = Math.round(performance.now() - start);
        if (res.statusCode >= 500) {
          logger.error("Request failed", new Error(`HTTP ${res.statusCode}`), {
            requestId,
            status: res.statusCode,
            durationMs: duration,
          });
        } else if (res.statusCode >= 400) {
          logger.warn("Request returned client error", {
            requestId,
            status: res.statusCode,
            durationMs: duration,
          });
        } else {
          logger.debug("Request completed", {
            requestId,
            status: res.statusCode,
            durationMs: duration,
          });
        }
      });

      next();
    } catch (error) {
      const duration = Math.round(performance.now() - start);

      logger.error("Unhandled exception in request", error as Error, {
        requestId,
        durationMs: duration,
      });

      // let global error handling middlware take care of it
      throw error;
    }
  };
}
