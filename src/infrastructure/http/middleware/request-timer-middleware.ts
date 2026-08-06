import { PerformanceTimer } from "#/shared/logging/logger.js";
import type { NextFunction, Request, Response } from "express";

export function requestTimerMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  req.startTime = new PerformanceTimer();

  next();
}
