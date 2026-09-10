import type {
  AgnosticHeaders,
  AuthPort,
  AuthSession,
} from "#/application/ports/auth/auth.port.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { initializeAuth, type Auth } from "../config/auth.js";
import type { DrizzleDBClient } from "../config/database.js";
import { createLogger } from "#/shared/logging/logger.js";
import { handleBetterAuthErrors } from "#/shared/errors/handle-better-auth-errors.js";

export class BetterAuthAdapter implements AuthPort {
  private logger = createLogger("BetterAuthAdapter");

  private auth: Auth;

  constructor(db: DrizzleDBClient, userRepo: UserRepository) {
    this.auth = initializeAuth(db, userRepo);
  }

  async getSession(headers: AgnosticHeaders): Promise<AuthSession | null> {
    this.logger.info("getSession called", { headers });

    try {
      const auth = await this.auth;

      const session = await auth.api.getSession({ headers });

      if (!session) {
        this.logger.info("No session found", { headers });

        return null;
      }

      return {
        user: {
          role: session.user.role,
          id: session.user.id,
          createdAt: session.user.createdAt,
          updatedAt: session.user.updatedAt,
          email: session.user.email,
          emailVerified: session.user.emailVerified,
          name: session.user.name,
          image: session.user.image ?? null,
        },
      };
    } catch (error) {
      this.logger.error("Error getting session", error as Error, { headers });

      handleBetterAuthErrors(error, "BetterAuthAdapter.getSession");
      throw error;
    }
  }
}
