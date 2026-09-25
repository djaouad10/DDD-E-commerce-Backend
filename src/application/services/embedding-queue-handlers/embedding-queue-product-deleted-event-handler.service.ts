import type { EmbeddingQueueProductDeletedEventHandlerCommand } from "#/application/commands/embedding-queue-handlers/embedding-queue-product-deleted-event-handler.command.js";
import type { IdempotencyKeysRepository } from "#/application/ports/persistence/idempotency-keys.repository.port.js";
import type { ProductEmbeddingRepository } from "#/application/ports/persistence/product-embedding.repository.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { DBClient } from "#/shared/types/db-client.js";

export class EmbeddingQueueProductDeletedEventHandlerService {
  private logger = createLogger(
    "EmbeddingQueueProductDeletedEventHandlerService",
  );

  constructor(
    private db: DBClient,
    private productEmbeddingRepository: ProductEmbeddingRepository,
    private idempotencyKeysRepository: IdempotencyKeysRepository,
  ) {}

  async execute(
    command: EmbeddingQueueProductDeletedEventHandlerCommand,
    jobId: string,
  ) {
    this.logger.info(
      "EmbeddingQueueProductDeletedEventHandlerService.execute called",
      {
        jobId,
        productId: command.productId,
      },
    );

    await this.db.transaction(async (tx) => {
      await this.idempotencyKeysRepository.create(
        jobId,
        "EmbeddingQueueProductDeletedEventHandlerService",
        tx,
      );

      await this.productEmbeddingRepository.deleteByProductId(
        command.productId,
        tx,
      );
    });
  }
}
