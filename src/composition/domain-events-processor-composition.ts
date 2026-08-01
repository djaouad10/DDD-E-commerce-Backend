import { Container } from "./container.js";
import { registerSharedInfrastructure } from "./shared-registry.js";
import { DB, REDIS } from "./tokens.js";

export function buildDomainEventsProcessorContainer(): Container {
  const container = new Container();

  registerSharedInfrastructure(container);

  container.register(
    OUTBOX_QUEUE,
    (scope) => createBullMqOutboxQueue(scope.resolve(REDIS)),
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
