import type { Scope } from "#/composition/container.js";
import type { PerformanceTimer } from "../logging/logger.ts";

declare global {
  namespace Express {
    interface Request {
      scope: Scope;
      user?: { id: string; role: UserRole };
      startTime?: PerformanceTimer;
    }
  }
}

export {}; // makes this a module so the global augmentation works correctly
