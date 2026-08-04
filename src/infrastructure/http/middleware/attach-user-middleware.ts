import { AUTH } from "#/composition/tokens.js";
import type { NextFunction, Request, Response } from "express";

export async function attachUserMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const auth = await req.scope.resolve(AUTH);

  const session = await auth.api.getSession({ headers: req.header });

  if (session) {
    req.user = { id: session.user.id, role: session.user.role };
  }

  next();
}
