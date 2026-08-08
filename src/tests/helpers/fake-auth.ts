import { UserId } from "#/domain/value-objects/user-id.js";
import type { Auth } from "#/infrastructure/config/auth.js";
import type { Request } from "express";

export const fakeAuth = {
  api: {
    getSession: async ({ headers }: { headers: Request["headers"] }) => {
      const authHeader = headers["authorization"];
      console.log("AAAAAAAAAAA", authHeader);

      if (!authHeader?.startsWith("Bearer ")) return null;

      const token = authHeader.slice(7); // remove "Bearer " prefix

      if (token === "test-admin-token") {
        return {
          user: { id: UserId.generate().value, role: "ADMIN" },
        };
      }
      if (token === "test-client-token") {
        return {
          user: { id: UserId.generate().value, role: "CLIENT" },
        };
      }

      // Handle "test-client-token userId" format
      const [baseToken, userId] = token.split(" ");
      if (baseToken === "test-client-token" && userId) {
        return {
          user: { id: userId, role: "CLIENT" },
        };
      }
      if (baseToken === "test-admin-token" && userId) {
        return {
          user: { id: userId, role: "ADMIN" },
        };
      }

      return null;
    },
  },
} as any as Auth;
