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
    UPLOADTHING_TOKEN: z.string(),
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
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    DEBUG_DB: process.env.DEBUG_DB,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    LOG_LEVEL: process.env.LOG_LEVEL,
    UPLOADTHING_APP_ID: process.env.UPLOADTHING_APP_ID,
    UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    WORLD_EXPRESS_API_URL: process.env.WORLD_EXPRESS_API_URL,
    WORLD_EXPRESS_API_KEY: process.env.WORLD_EXPRESS_API_KEY,
    EMAIL_SENDER_NAME: process.env.EMAIL_SENDER_NAME,
    EMAIL_SENDER_ADDRESS: process.env.EMAIL_SENDER_ADDRESS,
    SERVICE_NAME: process.env.SERVICE_NAME,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_BASE_URL: process.env.BREVO_BASE_URL,
  },

  /*
   * Treats empty strings like "" as undefined, allowing defaults to take over.
   */
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
