import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const agentEnv = createEnv({
  server: {
    GEMINI_API_KEY: z.string(),
    GEMINI_CHAT_MODEL: z.string(),
    MCP_API_KEY: z.string(),
    MCP_SERVER_URL: z.string(),
    STORE_NAME: z.string(),
    ASSISTANT_MAX_STEPS: z.coerce.number().default(8),
    PORT: z.coerce.number().default(8080),
    DATABASE_URL: z.url(),
    DEBUG_DB: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    GOOGLE_CLIENT_ID: z.string(),
    BETTER_AUTH_URL: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    NODE_ENV: z.enum(["development", "production", "test"]),
  },

  runtimeEnv: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_CHAT_MODEL: process.env.GEMINI_CHAT_MODEL,
    MCP_API_KEY: process.env.MCP_API_KEY,
    MCP_SERVER_URL: process.env.MCP_SERVER_URL,
    STORE_NAME: process.env.STORE_NAME,
    ASSISTANT_MAX_STEPS: process.env.ASSISTANT_MAX_STEPS,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    DEBUG_DB: process.env.DEBUG_DB,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  },

  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
