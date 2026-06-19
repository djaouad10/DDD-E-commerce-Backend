import { defineConfig } from "drizzle-kit";
import { env } from "./env.js";

export default defineConfig({
  // paths relative to root directory, not to the location of this file
  out: "./src/infrastructure/databases/migrations",
  schema: "./src/infrastructure/databases/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
