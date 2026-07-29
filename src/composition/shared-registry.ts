import type { Container } from "./container.js";
import { DB, REDIS } from "./tokens.js";
import { db } from "#/infrastructure/config/database.js";

import { redisConnection } from "#/infrastructure/config/redis-connection.js";

export function registerSharedInfrastructure(container: Container): void {
  // registers shared infra singeltons: db, redis connection, queues,... etc.
  container.registerInstance(DB, db);
  container.registerInstance(REDIS, redisConnection);
}
