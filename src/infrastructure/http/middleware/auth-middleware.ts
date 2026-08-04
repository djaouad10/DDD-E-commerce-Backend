import { UnauthorizedError } from "#/shared/errors/domain-error.js";
import type { NextFunction, Request, Response } from "express";

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    throw new UnauthorizedError();
  }

  next();
}
