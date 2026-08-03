import { ForbiddenError } from "#/shared/errors/domain-error.js";
import type { NextFunction, Request } from "express";

export async function adminMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (req.user && req.user.role === "ADMIN") {
    next();
  }

  throw new ForbiddenError(
    "access a protected route",
    req.user?.id ?? "unknown user",
  );
}
