import type { TransactionClient } from "#/shared/types/transaction-client.js";

export type IdempotencyKeyEntry = {
  id: string;
  handlerName: string;
  createdAt: Date;
  payload?: unknown;
};

export interface IdempotencyKeysRepository {
  create(id: string, handlerName: string, tx: TransactionClient, payload?: unknown): Promise<void>;
  find(id: string, tx: TransactionClient): Promise<IdempotencyKeyEntry | null>;
}
