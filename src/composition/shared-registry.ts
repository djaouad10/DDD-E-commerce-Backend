import type { Container } from "./container.js";
import { DB, REDIS } from "./tokens.js";
import { createDb } from "#/infrastructure/config/database.js";

import { redisConnection } from "#/infrastructure/config/redis-connection.js";
import { env } from "#/infrastructure/config/env.js";

export function registerSharedInfrastructure(container: Container): void {
  // registers shared infra singeltons: db, redis connection, queues,... etc.
  const db = createDb({ connectionUrl: env.DATABASE_URL, maxPoolSize: 10 });
  container.registerInstance(DB, db);
  container.registerInstance(REDIS, redisConnection);
}
