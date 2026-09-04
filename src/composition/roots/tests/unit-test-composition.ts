import { OutboxProcessorService } from "#/application/services/outbox-processor/outbox-processor.service.js";
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
import { FakeQueue } from "#/tests/helpers/fake-queue.js";
import type { Queue } from "bullmq";
import { Container } from "../../utils/container.js";
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
  EVENT_PUBLISHER,
  DOMAIN_EVENTS_PROCESSOR_SERVICE,
  SHIPPING_PROVIDER_GATEWAY,
  IDEMPOTENCY_KEYS_REPOSITORY,
  CREATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE,
  DELETE_ORDER_FROM_SHIPPING_PROVIDER_SERVICE,
} from "../../utils/tokens.js";
import RedisMock from "ioredis-mock";
import { FakeEventPublisher } from "#/tests/helpers/fake-event-publisher.js";
import { DomainEventsProcessorService } from "#/application/services/domain-events-processor/domain-events-processor.service.js";
import { InMemoryShippingProviderGateway } from "#/infrastructure/gateways/in-memory-shipping-provider-gateway.js";
import { InMemoryIdempotencyKeysRepository } from "#/infrastructure/databases/repositories/in-memory/in-memory-idempotency-keys-repository.js";
import { CreateOrderInShippingProviderService } from "#/application/services/outbox-handlers/create-order-in-shipping-provider.service.js";
import { DeleteOrderFromShippingProviderService } from "#/application/services/outbox-handlers/delete-order-from-shipping-provider.service.js";

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
    "scoped",
  );

  container.register(
    CATEGORY_REPOSITORY,
    () => new InMemoryCategoryRepository(),
    "scoped",
  );

  container.register(
    ORDER_REPOSITORY,
    () => new InMemoryOrderRepository(),
    "scoped",
  );

  container.register(
    PRODUCT_REPOSITORY,
    () => new InMemoryProductRepository(),
    "scoped",
  );

  container.register(
    RATING_REPOSITORY,
    () => new InMemoryRatingRepository(),
    "scoped",
  );

  container.register(
    USER_REPOSITORY,
    () => new InMemoryUserRepository(),
    "scoped",
  );

  container.register(
    OUTBOX_REPOSITORY,
    () => new InMemoryOutboxRepository(),
    "scoped",
  );

  container.register(
    IDEMPOTENCY_KEYS_REPOSITORY,
    () => new InMemoryIdempotencyKeysRepository(),
    "scoped",
  );

  // gateways
  container.register(
    FILE_STORE_GATEWAY,
    () => new InMemoryFileStoreGateway(),
    "scoped",
  );

  container.register(
    SHIPPING_PROVIDER_GATEWAY,
    () => new InMemoryShippingProviderGateway(),
    "scoped",
  );

  // queues
  container.register(
    OUTBOX_QUEUE,
    () => new FakeQueue() as unknown as Queue,
    "singleton",
  );

  // other
  container.register(
    EVENT_PUBLISHER,
    () => new FakeEventPublisher(),
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

  container.register(
    DOMAIN_EVENTS_PROCESSOR_SERVICE,
    (scope) =>
      new DomainEventsProcessorService(
        scope.resolve(OUTBOX_REPOSITORY),
        scope.resolve(EVENT_PUBLISHER),
      ),
    "scoped",
  );

  container.register(
    CREATE_ORDER_IN_SHIPPING_PROVIDER_SERVICE,
    (scope) =>
      new CreateOrderInShippingProviderService(
        scope.resolve(DB),
        scope.resolve(ORDER_REPOSITORY),
        scope.resolve(SHIPPING_PROVIDER_GATEWAY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    DELETE_ORDER_FROM_SHIPPING_PROVIDER_SERVICE,
    (scope) =>
      new DeleteOrderFromShippingProviderService(
        scope.resolve(DB),
        scope.resolve(SHIPPING_PROVIDER_GATEWAY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  return container;
}
