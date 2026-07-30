import { OutboxProcessorService } from "#/application/services/outbox-processor.service.js";
import {
  type DrizzleDBClient,
  type DrizzleTransactionClient,
} from "#/infrastructure/config/database.js";
import { InMemoryCartRepository } from "#/infrastructure/databases/repositories/in-memory/in-memory-cart-repository.js";
import { InMemoryCategoryRepository } from "#/infrastructure/databases/repositories/in-memory/in-memory-category-repository.js";
import { InMemoryOrderRepository } from "#/infrastructure/databases/repositories/in-memory/in-memory-order-repository.js";
import { InMemoryOutboxRepository } from "#/infrastructure/databases/repositories/in-memory/in-memory-outbox-repository.js";
import { InMemoryProductRepository } from "#/infrastructure/databases/repositories/in-memory/in-memory-product-repository.js";
import { InMemoryRatingRepository } from "#/infrastructure/databases/repositories/in-memory/in-memory-rating-repository.js";
import { InMemoryUserRepository } from "#/infrastructure/databases/repositories/in-memory/in-memory-user-repository.js";
import { InMemoryFileStoreGateway } from "#/infrastructure/gateways/in-memory-file-store-gateway.js";
import { createOutboxQueue } from "#/infrastructure/messaging/queue/outbox.queue.js";
import { FakeQueue } from "#/tests/helpers/fake-queue.js";
import type { Queue } from "bullmq";
import { Container } from "../container.js";
import {
  DB,
  CART_REPOSITORY,
  USER_REPOSITORY,
  ORDER_REPOSITORY,
  CATEGORY_REPOSITORY,
  PRODUCT_REPOSITORY,
  RATING_REPOSITORY,
  OUTBOX_REPOSITORY,
  REDIS,
  FILE_STORE_GATEWAY,
  OUTBOX_PROCESSOR_SERVICE,
  OUTBOX_QUEUE,
} from "../tokens.js";
import RedisMock from "ioredis-mock";

export function buildUnitTestsContainer(): Container {
  const container = new Container();

  // singletons
  const testDb = {
    transaction: async <T>(
      cb: (tx: DrizzleTransactionClient) => Promise<T>,
    ): Promise<T> => {
      return cb({} as DrizzleTransactionClient);
    },
  } as unknown as DrizzleDBClient;

  container.registerInstance(DB, testDb);

  const testRedisConnection = new RedisMock({
    maxRetriesPerRequest: null, // required by bullmq
    enableReadyCheck: false, // required by bullmq
    lazyConnect: true, // connection is established on first use instead of on server startup (faster startup time)
  });

  container.registerInstance(REDIS, testRedisConnection);

  // repositories
  container.register(
    CART_REPOSITORY,
    () => new InMemoryCartRepository(),
    "singleton",
  );

  container.register(
    CATEGORY_REPOSITORY,
    () => new InMemoryCategoryRepository(),
    "singleton",
  );

  container.register(
    ORDER_REPOSITORY,
    () => new InMemoryOrderRepository(),
    "singleton",
  );

  container.register(
    PRODUCT_REPOSITORY,
    () => new InMemoryProductRepository(),
    "singleton",
  );

  container.register(
    RATING_REPOSITORY,
    () => new InMemoryRatingRepository(),
    "singleton",
  );

  container.register(
    USER_REPOSITORY,
    () => new InMemoryUserRepository(),
    "singleton",
  );

  container.register(
    OUTBOX_REPOSITORY,
    () => new InMemoryOutboxRepository(),
    "singleton",
  );

  // gateways
  container.register(
    FILE_STORE_GATEWAY,
    () => new InMemoryFileStoreGateway(),
    "singleton",
  );

  // queues
  container.register(
    OUTBOX_QUEUE,
    () => new FakeQueue() as unknown as Queue,
    "singleton",
  );

  // services (scoped)
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
