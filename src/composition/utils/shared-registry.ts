import type { Container } from "./container.js";
import { DB, DRIZZLE_DB, REDIS } from "./tokens.js";
import { createDrizzleDB } from "#/infrastructure/config/database.js";

import { createRedisConnection } from "#/infrastructure/config/redis-connection.js";
import { env } from "#/infrastructure/config/env.js";

export function registerSharedInfrastructure(container: Container): void {
  // registers shared infra singeltons: db, redis connection, queues,... etc.
  const db = createDrizzleDB({
    connectionUrl: env.DATABASE_URL,
    maxPoolSize: 10,
  }); // in case I decided to switch to another ORM/DB I can use the new factory with DB token and keep the drizzle factory to register with DRIZZLE_DB
  container.registerInstance(DB, db);

  container.registerInstance(DRIZZLE_DB, db);

  const redisConnection = createRedisConnection({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    maxRetriesPerRequest: null, // required by bullmq
    enableReadyCheck: false, // required by bullmq
    lazyConnect: true, // connection is established on first use instead of on server startup (faster startup time)
  });

  container.registerInstance(REDIS, redisConnection);
}
