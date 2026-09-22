import type {
  EmbeddingUpsertParams,
  ProductEmbeddingRepository,
} from "#/application/ports/persistence/product-embedding.repository.js";
import type { DrizzleTransactionClient } from "#/infrastructure/config/database.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";
import { eq } from "drizzle-orm";
import { handleDrizzleErrors } from "../../errors/handle-drizzle-errors.js";
import { productEmbeddings } from "../../schema.js";
import { generateProductEmbeddingId } from "../../utils.js";

export class PostgresProductEmbeddingRepository implements ProductEmbeddingRepository {
  private logger = createLogger("PostgresProductEmbeddingRepository");

  async upsert(
    params: EmbeddingUpsertParams,
    tx: TransactionClient,
  ): Promise<void> {
    this.logger.debug("upsert called", { productId: params.productId });

    const db = tx as DrizzleTransactionClient;

    try {
      // next queries are atomic in postgres, they use the same tx client

      await this.logger.measure("db.delete(productEmbeddings)", () =>
        db
          .delete(productEmbeddings)
          .where(eq(productEmbeddings.product_id, params.productId)),
      );

      await this.logger.measure("db.insert(productEmbeddings)", () =>
        db.insert(productEmbeddings).values({
          id: generateProductEmbeddingId(),
          product_id: params.productId,
          embedding: params.embedding,
          content: params.content,
          chunk_index: params.chunkIndex,
        }),
      );
    } catch (error) {
      this.logger.error("upsert failed", error as Error, {
        productId: params.productId,
      });

      handleDrizzleErrors(error, "PostgresProductEmbeddingRepository.upsert");
    }
  }

  async deleteByProductId(
    productId: string,
    tx: TransactionClient,
  ): Promise<void> {
    this.logger.debug("deleteByProductId called", { productId });

    try {
      const db = tx as DrizzleTransactionClient;

      await this.logger.measure("db.delete(productEmbeddings)", () =>
        db
          .delete(productEmbeddings)
          .where(eq(productEmbeddings.product_id, productId)),
      );
    } catch (error) {
      this.logger.error("deleteByProductId failed", error as Error, {
        productId,
      });

      handleDrizzleErrors(
        error,
        "PostgresProductEmbeddingRepository.deleteByProductId",
      );
    }
  }
}
