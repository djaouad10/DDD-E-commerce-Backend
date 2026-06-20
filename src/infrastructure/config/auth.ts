import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { admin, customSession } from "better-auth/plugins";
import { env } from "./env.js";
import { db } from "./database.js";
import { getUserById } from "../databases/utils.js";

const customSessionPlugin = customSession(async ({ user: myUser }) => {
  const dbUser = await getUserById(myUser.id);

  return {
    user: {
      ...myUser,
      role: dbUser ? dbUser.role : "CLIENT",
    },
  };
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      prompt: "select_account",
    },
  },
  plugins: [admin({ defaultRole: "CLIENT" }), customSessionPlugin],
  rateLimit: {
    enabled: env.NODE_ENV === "production",
    window: 10, // time window in seconds
    max: 100, // max requests in the window
  },
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },

  advanced: {
    database: {
      generateId: ({ model }) => {
        const uuid = crypto.randomUUID();

        const cleanUuid = uuid.replace(/-/g, "");

        if (model === "user") {
          return `usr_${cleanUuid}`;
        }

        return cleanUuid;
      },
    },
  },
});

export type Auth = typeof auth;
