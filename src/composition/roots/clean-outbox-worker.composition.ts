import { CleanOutboxService } from "#/application/services/outbox-cleaner/clean-outbox.service.js";
import { PostgresOutboxRepository } from "#/infrastructure/databases/repositories/postgres/postgres-outbox-repository.js";
import { Container } from "../utils/container.js";
import { registerSharedInfrastructure } from "../utils/shared-registry.js";
import {
  CLEAN_OUTBOX_SERVICE,
  DB,
  OUTBOX_REPOSITORY,
} from "../utils/tokens.js";

export function buildCleanOutboxContainer(): Container {
  const container = new Container();

  registerSharedInfrastructure(container);

  container.register(
    OUTBOX_REPOSITORY,
    (scope) => new PostgresOutboxRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    CLEAN_OUTBOX_SERVICE,
    (scope) =>
      new CleanOutboxService(
        scope.resolve(DB),
        scope.resolve(OUTBOX_REPOSITORY),
      ),
    "scoped",
  );

  return container;
}
