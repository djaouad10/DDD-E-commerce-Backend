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
    DEBUG_DB: z.coerce.boolean().default(false),
    BETTER_AUTH_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
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
