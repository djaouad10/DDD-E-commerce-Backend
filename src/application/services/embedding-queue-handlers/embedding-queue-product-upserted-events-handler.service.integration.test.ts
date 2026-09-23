import { EmbeddingQueueProductUpsertedEventsHandlerCommand } from "#/application/commands/embedding-queue-handlers/embedding-queue-product-created-event-handler.command.js";
import type { ProductEmbeddingRepository } from "#/application/ports/persistence/product-embedding.repository.js";
import { buildIntegrationTestsContainer } from "#/composition/roots/tests/integration-tests-composition.js";
import type { Container } from "#/composition/utils/container.js";
import {
  EMBEDDING_QUEUE_PRODUCT_UPSERTED_EVENTS_HANDLER_SERVICE,
  PRODUCT_EMBEDDING_REPOSITORY,
  TEXT_EMBEDDING_MODEL_PORT,
} from "#/composition/utils/tokens.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { generateOutboxId } from "#/infrastructure/databases/outbox/utils.js";
import { ConflictError, NotFoundError } from "#/shared/errors/errors.js";
import {
  clearDatabase,
  findIdempotencyKeyInDB,
} from "#/tests/helpers/db-helpers.js";
import { getChunksOfProduct } from "#/tests/helpers/embedding-helpers.js";
import type { FakeTextEmbeddingModel } from "#/tests/helpers/fake-text-embedding-model.js";
import { setupProductAndCategory } from "#/tests/helpers/product-helpers.js";
import type { EmbeddingQueueProductUpsertedEventsHandlerService } from "./embedding-queue-product-upserted-events-handler.service.js";

describe("EmbeddingQueueProductUpsertedEventsHandlerService", () => {
  let container: Container;
  let service: EmbeddingQueueProductUpsertedEventsHandlerService;
  let fakeEmbedModel: FakeTextEmbeddingModel;
  let productEmbeddingRepo: ProductEmbeddingRepository;

  beforeAll(() => {
    container = buildIntegrationTestsContainer();
    service = container.resolveSingleton(
      EMBEDDING_QUEUE_PRODUCT_UPSERTED_EVENTS_HANDLER_SERVICE,
    );
    productEmbeddingRepo = container.resolveSingleton(
      PRODUCT_EMBEDDING_REPOSITORY,
    );
    fakeEmbedModel = container.resolveSingleton(
      TEXT_EMBEDDING_MODEL_PORT,
    ) as FakeTextEmbeddingModel;
  });

  beforeEach(async () => {
    await clearDatabase(container);
  });

  test("when called with valid arguments, it should chunk the product and save the chunks and their embeddings in the database", async () => {
    // Arrange
    const jobId = generateOutboxId();
    const { product } = await setupProductAndCategory(container);

    // Act
    await service.execute(
      new EmbeddingQueueProductUpsertedEventsHandlerCommand(product.id.value),
      jobId,
    );

    // Assert
    const productChunks = await getChunksOfProduct(container, product.id.value);
    expect(productChunks.length).toBeGreaterThanOrEqual(1);

    expect(fakeEmbedModel.embed).toHaveBeenCalledTimes(1);
  });

  test("when called more than once with the same jobId, it should throw a conflict error", async () => {
    // Arrange
    const jobId = generateOutboxId();
    const { product } = await setupProductAndCategory(container);

    // Act
    await service.execute(
      new EmbeddingQueueProductUpsertedEventsHandlerCommand(product.id.value),
      jobId,
    );

    // Assert
    await expect(
      service.execute(
        new EmbeddingQueueProductUpsertedEventsHandlerCommand(product.id.value),
        jobId,
      ),
    ).rejects.toThrow(ConflictError);
  });

  test("when product doesn't exist, it should throw a not found error and no chunks or idempotency key should be saved", async () => {
    // Arrange
    const jobId = generateOutboxId();

    // Act & Assert
    await expect(
      service.execute(
        new EmbeddingQueueProductUpsertedEventsHandlerCommand(
          ProductId.generate().value,
        ),
        jobId,
      ),
    ).rejects.toThrow(NotFoundError);

    const idempotencyKey = await findIdempotencyKeyInDB(container, jobId);
    expect(idempotencyKey).toBe(null);
  });

  test("when text embedding model throws an error, it should throw the error and no chunks or idempotency key should be saved", async () => {
    // Arrange
    const jobId = generateOutboxId();
    const { product } = await setupProductAndCategory(container);

    fakeEmbedModel.embed.mockRejectedValueOnce(
      new Error("Something went wrong"),
    );

    // Act & Assert
    await expect(
      service.execute(
        new EmbeddingQueueProductUpsertedEventsHandlerCommand(product.id.value),
        jobId,
      ),
    ).rejects.toThrow("Something went wrong");

    const idempotencyKey = await findIdempotencyKeyInDB(container, jobId);
    expect(idempotencyKey).toBe(null);

    const productChunks = await getChunksOfProduct(container, product.id.value);
    expect(productChunks.length).toBe(0);
  });
});
