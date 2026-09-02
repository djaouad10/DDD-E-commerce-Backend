// src/env.ts
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  /*
   * Server-side environment variables schema.
   */
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]),
    PORT: z.string().transform((val) => parseInt(val, 10)),
    DATABASE_URL: z.url(),
    DEBUG_DB: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    BETTER_AUTH_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]),
    UPLOADTHING_APP_ID: z.string(),
    REDIS_HOST: z.string().min(1),
    REDIS_PORT: z.coerce.number().default(6379),
    WORLD_EXPRESS_API_URL: z.url(),
    WORLD_EXPRESS_API_KEY: z.string(),
    EMAIL_SENDER_NAME: z.string(),
    EMAIL_SENDER_ADDRESS: z.email(),
    SERVICE_NAME: z.string(),
    BREVO_API_KEY: z.string(),
    BREVO_BASE_URL: z.string(),
  },

  /*
   * Tell T3 Env to validate against the standard Node process object.
   */
  runtimeEnv: process.env,

  /*
   * Treats empty strings like "" as undefined, allowing defaults to take over.
   */
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
