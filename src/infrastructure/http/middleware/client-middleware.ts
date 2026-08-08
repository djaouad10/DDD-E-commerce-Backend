import { ForbiddenError } from "#/shared/errors/domain-error.js";
import type { NextFunction, Request } from "express";

export async function clientMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (req.user && req.user.role === "CLIENT") {
    return next();
  }

  throw new ForbiddenError(
    "access a protected route",
    req.user?.id ?? "unknown user",
  );
}
