import { CleanOutboxService } from "#/application/services/clean-outbox.service.js";
import { PostgresIdempotencyKeysRepository } from "#/infrastructure/databases/repositories/postgres/postgres-idempotency-keys-repository.js";
import { PostgresOutboxRepository } from "#/infrastructure/databases/repositories/postgres/postgres-outbox-repository.js";
import { Container } from "./container.js";
import { registerSharedInfrastructure } from "./shared-registry.js";
import {
  CLEAN_OUTBOX_SERVICE,
  DB,
  IDEMPOTENCY_KEYS_REPOSITORY,
  OUTBOX_REPOSITORY,
} from "./tokens.js";

export function buildCleanOutboxContainer(): Container {
  const container = new Container();

  registerSharedInfrastructure(container);

  container.register(
    OUTBOX_REPOSITORY,
    (scope) => new PostgresOutboxRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    IDEMPOTENCY_KEYS_REPOSITORY,
    (scope) => new PostgresIdempotencyKeysRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    CLEAN_OUTBOX_SERVICE,
    (scope) =>
      new CleanOutboxService(
        scope.resolve(DB),
        scope.resolve(OUTBOX_REPOSITORY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  return container;
}
