import { AUTH } from "#/composition/tokens.js";
import { UnauthorizedError } from "#/shared/errors/domain-error.js";
import type { NextFunction, Request, Response } from "express";

export async function AuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  // not try catch since error handled by error middleware
  const auth = await req.scope.resolve(AUTH);

  const session = await auth.api.getSession({ headers: req.header });

  if (!session) {
    throw new UnauthorizedError();
  }

  req.user = { id: session.user.id, role: session.user.role };
  next();
}
