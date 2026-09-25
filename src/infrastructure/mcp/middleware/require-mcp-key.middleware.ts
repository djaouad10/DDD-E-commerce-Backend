import { timingSafeEqual, createHash } from "node:crypto";
import type { RequestHandler } from "express";

export function requireMcpApiKey(expectedApiKey: string): RequestHandler {
  const expectedBuffer = createHash("sha256").update(expectedApiKey).digest();

  return (req, res, next) => {
    const authorization = req.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const provided = authorization.slice("Bearer ".length);
    const providedBuffer = createHash("sha256").update(provided).digest();

    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    next();
  };
}
