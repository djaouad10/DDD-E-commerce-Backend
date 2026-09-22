import type { TransactionClient } from "#/shared/types/transaction-client.js";

export type EmbeddingUpsertParams = {
  batch: {
    embedding: number[];
    content: string;
    chunkIndex: number;
  }[],
  productId: string;
};

export type ProductEmbeddingRepository = {
  upsert(params: EmbeddingUpsertParams, tx: TransactionClient): Promise<void>;

  deleteByProductId(productId: string, tx: TransactionClient): Promise<void>;
};
