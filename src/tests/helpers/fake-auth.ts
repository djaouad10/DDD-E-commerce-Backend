import type {
  AgnosticHeaders,
  AuthPort,
  AuthSession,
} from "#/application/ports/auth/auth.port.js";
import type { UserRole } from "#/domain/entities/user.js";
import { UserId } from "#/domain/value-objects/user-id.js";

export const fakeBetterAuth = {
  api: {
    getSession: async (headers: AgnosticHeaders) => {
      const authHeader = headers["authorization"];

      if (typeof authHeader !== "string") return null;

      if (!authHeader?.startsWith("Bearer ")) return null;

      const token = authHeader.slice(7); // remove "Bearer " prefix

      if (token === "test-admin-token") {
        return {
          user: { id: UserId.generate().value, role: "ADMIN" as UserRole },
        };
      }
      if (token === "test-client-token") {
        return {
          user: { id: UserId.generate().value, role: "CLIENT" as UserRole },
        };
      }

      // Handle "test-client-token userId" format
      const [baseToken, userId] = token.split(" ");
      if (baseToken === "test-client-token" && userId) {
        return {
          user: { id: userId, role: "CLIENT" as UserRole },
        };
      }
      if (baseToken === "test-admin-token" && userId) {
        return {
          user: { id: userId, role: "ADMIN" as UserRole },
        };
      }

      return null;
    },
  },
};

export class FakeAuthPort implements AuthPort {
  async getSession(headers: AgnosticHeaders): Promise<AuthSession | null> {
    const user = await fakeBetterAuth.api.getSession(headers);

    if (!user) return null;

    return {
      user: {
        id: user.user.id,
        role: user.user.role,
        email: "test-email",
        emailVerified: true,
        name: "test-name",
        createdAt: new Date(),
        updatedAt: new Date(),
        image: null,
      },
    };
  }
}
