import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "#/infrastructure/databases/schema.js";
import { env } from "./env.js";

export const createDrizzleDB = ({
  connectionUrl,
  maxPoolSize,
}: {
  connectionUrl: string;
  maxPoolSize: number;
}) => {
  const client = postgres(connectionUrl, {
    max: maxPoolSize, // connection pool size
  });

  return drizzle(client, {
    schema,
    logger: env.DEBUG_DB, // logs SQL queries
  });
};

export type DrizzleDBClient = ReturnType<typeof createDrizzleDB>;
export type DrizzleTransactionClient = Parameters<
  Parameters<DrizzleDBClient["transaction"]>[0]
>[0];
