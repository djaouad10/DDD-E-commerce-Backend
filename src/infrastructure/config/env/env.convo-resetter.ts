import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const convoResetterEnv = createEnv({
  server: {
    DATABASE_URL: z.url(),
    DEBUG_DB: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DEBUG_DB: process.env.DEBUG_DB,
  },

  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
