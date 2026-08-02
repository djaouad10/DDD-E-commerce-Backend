import type { TransactionClient } from "#/shared/types/transaction-client.js";

export interface IdempotencyKeysRepository {
  create(id: string, handlerName: string, tx: TransactionClient): Promise<void>;
}
