import { ResetStuckOutboxRowsService } from "#/application/services/stuck-outbox-resetter/reset-stuck-outbox-rows.service.js";
import { PostgresOutboxRepository } from "#/infrastructure/databases/repositories/postgres/postgres-outbox-repository.js";
import { Container } from "./container.js";
import { registerSharedInfrastructure } from "./shared-registry.js";
import {
  DB,
  OUTBOX_REPOSITORY,
  RESET_STUCK_OUTBOX_ROWS_SERVICE,
} from "./tokens.js";

export function buildResetStuckOutboxRowsWorkerContainer(): Container {
  const container = new Container();

  registerSharedInfrastructure(container);

  container.register(
    OUTBOX_REPOSITORY,
    (scope) => new PostgresOutboxRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    RESET_STUCK_OUTBOX_ROWS_SERVICE,
    (scope) =>
      new ResetStuckOutboxRowsService(scope.resolve(OUTBOX_REPOSITORY)),
    "scoped",
  );

  return container;
}
