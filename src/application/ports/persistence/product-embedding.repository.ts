import type { TransactionClient } from "#/shared/types/transaction-client.js";

export type ProductEmbeddingRepository = {
  upsert(
    embedding: number[],
    productId: string,
    tx: TransactionClient,
  ): Promise<void>;
  deleteByProductId(productId: string, tx: TransactionClient): Promise<void>;
};
