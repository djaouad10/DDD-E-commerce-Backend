import type { Container, Scope } from "#/composition/container.js";
import type { NextFunction, Response, Request } from "express";

// augment express Request to hold the scope
declare global {
  namespace Express {
    interface Request {
      scope: Scope;
    }
  }
}

export function scopeMiddleware(container: Container) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.scope = container.createScope();

    res.on("finish", () => {
      req.scope.dispose().catch(console.error);
    });

    next();
  };
}
