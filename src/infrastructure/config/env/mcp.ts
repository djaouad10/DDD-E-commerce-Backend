import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const mcpEnv = createEnv({
  server: {
    MCP_API_KEY: z.string(),
    MCP_PORT: z.coerce.number().default(8000),
  },

  runtimeEnv: {
    MCP_API_KEY: process.env.MCP_API_KEY,
    MCP_PORT: process.env.MCP_PORT,
  },

  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
