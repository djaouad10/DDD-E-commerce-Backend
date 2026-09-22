import { chunkProduct } from "#/application/ai/product-chunker.js";
import type { EmbeddingQueueProductUpsertedEventsHandlerCommand } from "#/application/commands/embedding-queue-handlers/embedding-queue-product-created-event-handler.command.js";
import type { TextEmbeddingModelPort } from "#/application/ports/ai/text-embedding-model.port.js";
import type { IdempotencyKeysRepository } from "#/application/ports/persistence/idempotency-keys.repository.port.js";
import type { ProductEmbeddingRepository } from "#/application/ports/persistence/product-embedding.repository.js";
import type { ProductQueries } from "#/application/read-models/product.queries.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { GatewayError, NotFoundError } from "#/shared/errors/errors.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { DBClient } from "#/shared/types/db-client.js";

export class EmbeddingQueueProductUpsertedEventsHandlerService {
  private logger = createLogger(
    "EmbeddingQueueProductCreatedEventHandlerService",
  );

  constructor(
    private db: DBClient,
    private embeddingModel: TextEmbeddingModelPort,
    private productEmbeddingRepository: ProductEmbeddingRepository,
    private productQueries: ProductQueries,
    private idempotencyKeysRepository: IdempotencyKeysRepository,
  ) {}

  async execute(
    command: EmbeddingQueueProductUpsertedEventsHandlerCommand,
    jobId: string,
  ) {
    this.logger.info(
      "EmbeddingQueueProductUpsertedEventsHandlerService.execute called",
    );

    const productDto = await this.productQueries.getStaticData(
      ProductId.of(command.productId),
    );

    if (!productDto) {
      throw new NotFoundError("product", command.productId);
    }

    // chunk the product
    const chunks = chunkProduct({
      name: productDto.name,
      material: productDto.material,
      categoryName: productDto.category?.name ?? null,
      brand: productDto.brand,
      description: productDto.description,
    });

    // embed the chunks
    const embeddings = await this.embeddingModel.embed(
      chunks.map((c) => c.content),
    );

    // shape the batch for the embedding model's upsert() method
    const batch = chunks.map((chunk, index) => {
      const embedding = embeddings[index];

      // throw if no embedding generated for a specific chunk
      if (!embedding)
        throw new GatewayError("Gemeni", new Error("No embeddings returned"));

      return {
        chunkIndex: chunk.index,
        content: chunk.content,
        embedding,
      };
    });

    this.logger.debug("Upserting embeddings", { productId: productDto.id });

    await this.db.transaction(async (tx) => {
      await this.idempotencyKeysRepository.create(
        jobId,
        "EmbeddingQueueProductUpsertedEventsHandlerService",
        tx,
      );

      await this.productEmbeddingRepository.upsert(
        {
          productId: productDto.id,
          batch,
        },
        tx,
      );
    });
  }
}
