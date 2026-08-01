import { OutboxProcessorService } from "#/application/services/outbox-processor.service.js";
import { PostgresOutboxRepository } from "#/infrastructure/databases/repositories/postgres/postgres-outbox-repository.js";
import { createOutboxQueue } from "#/infrastructure/messaging/queue/outbox.queue.js";
import { Container } from "./container.js";
import { registerSharedInfrastructure } from "./shared-registry.js";
import {
  DB,
  OUTBOX_PROCESSOR_SERVICE,
  OUTBOX_QUEUE,
  OUTBOX_REPOSITORY,
  REDIS,
} from "./tokens.js";

export function buildOutboxProcessorContainer(): Container {
  const container = new Container();

  registerSharedInfrastructure(container);

  container.register(
    OUTBOX_QUEUE,
    (scope) => createOutboxQueue(scope.resolve(REDIS)),
    "singleton",
  );

  container.register(
    OUTBOX_REPOSITORY,
    (scope) => new PostgresOutboxRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    OUTBOX_PROCESSOR_SERVICE,
    (scope) =>
      new OutboxProcessorService(
        scope.resolve(OUTBOX_REPOSITORY),
        scope.resolve(OUTBOX_QUEUE),
      ),
    "scoped",
  );

  return container;
}
