import type { Container } from "./container.js";
import { DB, REDIS } from "./tokens.js";
import { createDb } from "#/infrastructure/config/database.js";

import { createRedisConnection } from "#/infrastructure/config/redis-connection.js";
import { env } from "#/infrastructure/config/env.js";

export function registerSharedInfrastructure(container: Container): void {
  // registers shared infra singeltons: db, redis connection, queues,... etc.
  const db = createDb({ connectionUrl: env.DATABASE_URL, maxPoolSize: 10 });
  container.registerInstance(DB, db);

  const redisConnection = createRedisConnection({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    maxRetriesPerRequest: null, // required by bullmq
    enableReadyCheck: false, // required by bullmq
    lazyConnect: true, // connection is established on first use instead of on server startup (faster startup time)
  });

  container.registerInstance(REDIS, redisConnection);
}
