import type { TransactionClient } from "#/shared/types/transaction-client.js";

export type EmbeddingUpsertParams = {
  embedding: number[];
  productId: string;
  content: string;
  chunkIndex: number;
};

export type ProductEmbeddingRepository = {
  upsert(
    params: EmbeddingUpsertParams,
    tx: TransactionClient,
  ): Promise<void>;
  deleteByProductId(productId: string, tx: TransactionClient): Promise<void>;
};
