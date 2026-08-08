import { createLogger, PerformanceTimer } from "#/shared/logging/logger.js";
import type { Request, Response, NextFunction } from "express";

// must be executed after the context-middlware
export async function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const logger = createLogger("requestLogger");
  const timer = req.startTime ?? new PerformanceTimer();

  logger.info("Request started", {
    method: req.method,
    path: req.path,
    query: req.query,
  });

  try {
    res.on("finish", () => {
      const duration = timer.elapsed();
      if (res.statusCode >= 500) {
        logger.error("Request failed", new Error(`HTTP ${res.statusCode}`), {
          status: res.statusCode,
          durationMs: duration,
        });
      } else if (res.statusCode >= 400) {
        logger.warn("Request returned client error", {
          status: res.statusCode,
          durationMs: duration,
        });
      } else {
        logger.debug("Request completed", {
          status: res.statusCode,
          durationMs: duration,
        });
      }
    });

    return next();
  } catch (error) {
    const duration = timer.elapsed();

    logger.error("Unhandled exception in request", error as Error, {
      durationMs: duration,
    });

    // let global error handling middlware take care of it
    throw error;
  }
}
