import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { admin, customSession } from "better-auth/plugins";
import { UserRole } from "#/domain/entities/user.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "./database.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";

export type BetterAuthConfig = {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  BETTER_AUTH_URL: string;
  NODE_ENV: "development" | "production" | "test";
}

export async function initializeAuth(
  db: DrizzleDBClient,
  userRepo: UserRepository,
  config: BetterAuthConfig
) {
  const customSessionPlugin = customSession(async ({ user: myUser }) => {
    const dbUser = await userRepo.find(UserId.of(myUser.id));

    return {
      user: {
        ...myUser,
        role: dbUser ? dbUser.role : UserRole.CLIENT,
      },
    };
  });

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
    }),

    socialProviders: {
      google: {
        clientId: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        prompt: "select_account",
      },
    },
    plugins: [admin({ defaultRole: UserRole.CLIENT }), customSessionPlugin],
    rateLimit: {
      enabled: config.NODE_ENV === "production",
      window: 10, // time window in seconds
      max: 100, // max requests in the window
    },
    baseURL: config.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
    },

    advanced: {
      database: {
        generateId: ({ model }) => {
          const uuid = crypto.randomUUID();

          const cleanUuid = uuid.replace(/-/g, "");

          if (model === "user") {
            return UserId.generate().value;
          }

          return cleanUuid;
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof initializeAuth>;
