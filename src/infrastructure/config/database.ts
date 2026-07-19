import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "#/infrastructure/databases/schema.js";
import { env } from "./env.js";

const createDb = () => {
  const client = postgres(env.DATABASE_URL, {
    max: 10, // connection pool size
  });

  return drizzle(client, {
    schema,
    logger: env.DEBUG_DB, // logs SQL queries
  });
};

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof createDb> | undefined;
};

export const db = globalForDb.db ?? createDb();

export type DrizzleDBClient = typeof db;
export type DrizzleTransactionClient = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
