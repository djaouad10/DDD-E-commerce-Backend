import type { Container } from "#/composition/utils/container.js";
import type { NextFunction, Response, Request } from "express";

export function scopeMiddleware(container: Container) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.scope = container.createScope();

    res.on("finish", () => {
      req.scope.dispose().catch(console.error);
    });

    return next();
  };
}
