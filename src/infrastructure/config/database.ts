import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "#/infrastructure/databases/schema.js";

export const createDrizzleDB = ({
  connectionUrl,
  maxPoolSize,
  debug,
}: {
  connectionUrl: string;
  maxPoolSize: number;
  debug: boolean;
}) => {
  const client = postgres(connectionUrl, {
    max: maxPoolSize, // connection pool size
  });

  return drizzle(client, {
    schema,
    logger: debug, // logs SQL queries
  });
};

export type DrizzleDBClient = ReturnType<typeof createDrizzleDB>;
export type DrizzleTransactionClient = Parameters<
  Parameters<DrizzleDBClient["transaction"]>[0]
>[0];
