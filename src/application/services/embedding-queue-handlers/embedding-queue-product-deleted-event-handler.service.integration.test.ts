import { EmbeddingQueueProductDeletedEventHandlerCommand } from "#/application/commands/embedding-queue-handlers/embedding-queue-product-deleted-event-handler.command.js";
import { buildIntegrationTestsContainer } from "#/composition/roots/tests/integration-tests-composition.js";
import type { Container } from "#/composition/utils/container.js";
import { EMBEDDING_QUEUE_PRODUCT_DELETED_EVENTS_HANDLER_SERVICE } from "#/composition/utils/tokens.js";
import { generateOutboxId } from "#/infrastructure/databases/outbox/utils.js";
import { ConflictError } from "#/shared/errors/errors.js";
import {
  clearDatabase,
  findIdempotencyKeyInDB,
} from "#/tests/helpers/db-helpers.js";
import {
  embedAndSaveProductChunksInDB,
  getChunksOfProduct,
} from "#/tests/helpers/embedding-helpers.js";
import { setupProductAndCategory } from "#/tests/helpers/product-helpers.js";
import type { EmbeddingQueueProductDeletedEventHandlerService } from "./embedding-queue-product-deleted-event-handler.service.js";

describe("EmbeddingQueueProductDeletedEventHandlerService", () => {
  let container: Container;
  let service: EmbeddingQueueProductDeletedEventHandlerService;

  beforeAll(() => {
    container = buildIntegrationTestsContainer();

    service = container.resolveSingleton(
      EMBEDDING_QUEUE_PRODUCT_DELETED_EVENTS_HANDLER_SERVICE,
    );
  });

  beforeEach(async () => {
    await clearDatabase(container);
  });

  test("when called with valid arguments, it should remove the product chunks from the database and create an idempotency key", async () => {
    // Arrange
    const { product, category } = await setupProductAndCategory(container);

    await embedAndSaveProductChunksInDB(container, product, category);

    const jobId = generateOutboxId();

    // Act
    await service.execute(
      new EmbeddingQueueProductDeletedEventHandlerCommand(product.id.value),
      jobId,
    );

    // Assert
    const productChunks = await getChunksOfProduct(container, product.id.value);
    expect(productChunks.length).toBe(0);

    const idempotencyKey = await findIdempotencyKeyInDB(container, jobId);
    expect(idempotencyKey?.id).toBe(jobId);
  });

  test("when called with same jobId more than once, it should throw a conflict error the 2nd time", async () => {
    // Arrange
    const { product, category } = await setupProductAndCategory(container);

    await embedAndSaveProductChunksInDB(container, product, category);

    const jobId = generateOutboxId();

    // Act
    await service.execute(
      new EmbeddingQueueProductDeletedEventHandlerCommand(product.id.value),
      jobId,
    );

    // Assert
    await expect(
      service.execute(
        new EmbeddingQueueProductDeletedEventHandlerCommand(product.id.value),
        jobId,
      ),
    ).rejects.toThrow(ConflictError);
  });
});
