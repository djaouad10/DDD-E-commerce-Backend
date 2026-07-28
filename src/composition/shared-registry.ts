import type { Container } from "./container.js";
import { DB } from "./tokens.js";
import { db } from "#/infrastructure/config/database.js";

export function registerSharedInfrastructure(container: Container): void {
  // registers shared infra singeltons: db, redis connection, queues,... etc.
  container.registerInstance(DB, db);
}
