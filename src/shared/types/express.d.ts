import type { Scope } from "#/composition/container.js";

declare global {
  namespace Express {
    interface Request {
      scope: Scope;
      user?: { id: string; role: UserRole };
    }
  }
}

export {}; // makes this a module so the global augmentation works correctly
