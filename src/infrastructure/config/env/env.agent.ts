import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const agentEnv = createEnv({
  server: {
    GEMINI_API_KEY: z.string(),
    GEMINI_CHAT_MODEL: z.string(),
    MCP_API_KEY: z.string(),
    MCP_SERVER_URL: z.string(),
    STORE_NAME: z.string(),
  },

  runtimeEnv: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_CHAT_MODEL: process.env.GEMINI_CHAT_MODEL,
    MCP_API_KEY: process.env.MCP_API_KEY,
    MCP_SERVER_URL: process.env.MCP_SERVER_URL,
    STORE_NAME: process.env.STORE_NAME,
  },

  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
