import { UserId } from "#/domain/value-objects/user-id.js";
import type { Auth } from "#/infrastructure/config/auth.js";
import type { Request } from "express";

export const fakeAuth = {
  api: {
    getSession: async ({ headers }: { headers: Request["headers"] }) => {
      const authHeader = headers["authorization"];
      if (authHeader === "Bearer test-admin-token") {
        return { user: { id: UserId.generate().value, role: "ADMIN" } };
      }
      if (authHeader === "Bearer test-client-token") {
        return { user: { id: UserId.generate().value, role: "CLIENT" } };
      }
      return null;
    },
  },
} as any as Auth;
