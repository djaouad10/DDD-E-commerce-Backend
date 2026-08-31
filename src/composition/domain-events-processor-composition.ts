import { PostgresOutboxRepository } from "#/infrastructure/databases/repositories/postgres/postgres-outbox-repository.js";
import { createBullMqAnalyticsQueue } from "#/infrastructure/messaging/bullmq/queue/analytics.queue.js";
import { createBullMqEmailQueue } from "#/infrastructure/messaging/bullmq/queue/email.queue.js";
import { createBullMqInventoryQueue } from "#/infrastructure/messaging/bullmq/queue/inventory.queue.js";
import { Container } from "./container.js";
import { registerSharedInfrastructure } from "./shared-registry.js";
import {
  ANALYTICS_QUEUE,
  BULLMQ_FLOW_PRODUCER,
  DB,
  DOMAIN_EVENTS_PROCESSOR_SERVICE,
  EMAIL_QUEUE,
  EVENT_PUBLISHER,
  INVENTORY_QUEUE,
  OUTBOX_REPOSITORY,
  REDIS,
} from "./tokens.js";
import { createBullMqFlowProducer } from "#/infrastructure/messaging/bullmq/utils/bullmq-flow-producer.js";
import { BullMqEventPublisher } from "#/infrastructure/messaging/bullmq/bullmq-event-publisher.js";
import { DomainEventsProcessorService } from "#/application/services/domain-events-processor.service.js";

export function buildDomainEventsProcessorContainer(): Container {
  const container = new Container();

  registerSharedInfrastructure(container);

  container.register(
    EMAIL_QUEUE,
    (scope) => createBullMqEmailQueue(scope.resolve(REDIS)),
    "singleton",
  );

  container.register(
    ANALYTICS_QUEUE,
    (scope) => createBullMqAnalyticsQueue(scope.resolve(REDIS)),
    "singleton",
  );

  container.register(
    INVENTORY_QUEUE,
    (scope) => createBullMqInventoryQueue(scope.resolve(REDIS)),
    "singleton",
  );

  container.register(
    BULLMQ_FLOW_PRODUCER,
    (scope) => createBullMqFlowProducer(scope.resolve(REDIS)),
    "singleton",
  );

  container.register(
    EVENT_PUBLISHER,
    (scope) =>
      new BullMqEventPublisher(
        scope.resolve(BULLMQ_FLOW_PRODUCER),
        scope.resolve(EMAIL_QUEUE),
        scope.resolve(ANALYTICS_QUEUE),
        scope.resolve(INVENTORY_QUEUE),
      ),
    "singleton",
  );

  container.register(
    OUTBOX_REPOSITORY,
    (scope) => new PostgresOutboxRepository(scope.resolve(DB)),
    "singleton",
  );

  container.register(
    DOMAIN_EVENTS_PROCESSOR_SERVICE,
    (scope) =>
      new DomainEventsProcessorService(
        scope.resolve(OUTBOX_REPOSITORY),
        scope.resolve(EVENT_PUBLISHER),
      ),
    "scoped",
  );

  return container;
}
