import {
  runWithContext,
  type ContextStore,
} from "#/shared/context/request-context.js";
import type { Request, Response, NextFunction } from "express";

export function contextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId =
    (req.headers["x-request-id"] as string) ||
    `req_${crypto.randomUUID().replace(/-/g, "")}`;

  const store: ContextStore = {
    requestId,
    path: req.path,
    method: req.method,
    startTime: performance.now(),
    ...(req.user && { userId: req.user.id }),
    ...(req.user && { userRole: req.user.role }),
    ...(req.ip && { clientIp: req.ip }),
  };

  // Make requestId available to frontend for support tickets
  res.setHeader("x-request-id", requestId);

  // Run the rest of the request inside this context
  runWithContext(store, () => next());
}
