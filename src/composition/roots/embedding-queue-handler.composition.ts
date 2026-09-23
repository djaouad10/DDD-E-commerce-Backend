import { EmbeddingQueueProductDeletedEventHandlerService } from "#/application/services/embedding-queue-handlers/embedding-queue-product-deleted-event-handler.service.js";
import { EmbeddingQueueProductUpsertedEventsHandlerService } from "#/application/services/embedding-queue-handlers/embedding-queue-product-upserted-events-handler.service.js";
import {
  GemeniTextEmbeddingModelAdapter,
  type GemeniTextEmbeddingModelAdapterConfig,
} from "#/infrastructure/ai/adapters/gemeni-text-embedding-model.adapter.js";
import { createGemeniClient } from "#/infrastructure/ai/clients/gemeni-client.js";
import { aiEnv } from "#/infrastructure/config/env/env.ai.js";
import { PostgresProductQueries } from "#/infrastructure/databases/read-models/postgres/postgres-product-queries.js";
import { PostgresIdempotencyKeysRepository } from "#/infrastructure/databases/repositories/postgres/postgres-idempotency-keys-repository.js";
import { PostgresProductEmbeddingRepository } from "#/infrastructure/databases/repositories/postgres/postgres-product-embedding-repository.js";
import { Container } from "../utils/container.js";
import { registerSharedInfrastructure } from "../utils/shared-registry.js";
import {
  DB,
  DRIZZLE_DB,
  EMBEDDING_QUEUE_PRODUCT_DELETED_EVENTS_HANDLER_SERVICE,
  EMBEDDING_QUEUE_PRODUCT_UPSERTED_EVENTS_HANDLER_SERVICE,
  GEMENI_CLIENT,
  IDEMPOTENCY_KEYS_REPOSITORY,
  PRODUCT_EMBEDDING_REPOSITORY,
  PRODUCT_QUERIES,
  TEXT_EMBEDDING_MODEL_PORT,
} from "../utils/tokens.js";

export function buildEmbeddingQueueHandlerContainer(): Container {
  const container = new Container();

  registerSharedInfrastructure(container);

  const gemeniClient = createGemeniClient({ API_KEY: aiEnv.GEMINI_API_KEY });
  const textEmbeddingModelConfig: GemeniTextEmbeddingModelAdapterConfig = {
    EMBEDDING_DIMENSIONS: aiEnv.EMBEDDING_DIMENSIONS,
    GEMINI_EMBEDDING_MODEL: aiEnv.GEMINI_EMBEDDING_MODEL,
  };

  container.register(GEMENI_CLIENT, () => gemeniClient, "singleton");
  container.register(
    TEXT_EMBEDDING_MODEL_PORT,
    (scope) =>
      new GemeniTextEmbeddingModelAdapter(
        scope.resolve(GEMENI_CLIENT),
        textEmbeddingModelConfig,
      ),
    "scoped",
  );

  // repositories
  container.register(
    PRODUCT_EMBEDDING_REPOSITORY,
    () => new PostgresProductEmbeddingRepository(),
    "singleton",
  );

  container.register(
    IDEMPOTENCY_KEYS_REPOSITORY,
    () => new PostgresIdempotencyKeysRepository(),
    "singleton",
  );

  // read models
  container.register(
    PRODUCT_QUERIES,
    (scope) => new PostgresProductQueries(scope.resolve(DRIZZLE_DB)),
    "singleton",
  );

  // services
  container.register(
    EMBEDDING_QUEUE_PRODUCT_UPSERTED_EVENTS_HANDLER_SERVICE,
    (scope) =>
      new EmbeddingQueueProductUpsertedEventsHandlerService(
        scope.resolve(DB),
        scope.resolve(TEXT_EMBEDDING_MODEL_PORT),
        scope.resolve(PRODUCT_EMBEDDING_REPOSITORY),
        scope.resolve(PRODUCT_QUERIES),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  container.register(
    EMBEDDING_QUEUE_PRODUCT_DELETED_EVENTS_HANDLER_SERVICE,
    (scope) =>
      new EmbeddingQueueProductDeletedEventHandlerService(
        scope.resolve(DB),
        scope.resolve(PRODUCT_EMBEDDING_REPOSITORY),
        scope.resolve(IDEMPOTENCY_KEYS_REPOSITORY),
      ),
    "scoped",
  );

  return container;
}
