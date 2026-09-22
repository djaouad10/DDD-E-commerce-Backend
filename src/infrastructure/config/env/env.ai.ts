import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const aiEnv = createEnv({
  server: {
    GEMINI_API_KEY: z.string(),
    GEMINI_EMBEDDING_MODEL: z.string(),
    EMBEDDING_DIMENSIONS: z.coerce.number().default(768),
  },

  runtimeEnv: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_EMBEDDING_MODEL: process.env.GEMINI_EMBEDDING_MODEL,
    EMBEDDING_DIMENSIONS: process.env.EMBEDDING_DIMENSIONS,
  },

  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
