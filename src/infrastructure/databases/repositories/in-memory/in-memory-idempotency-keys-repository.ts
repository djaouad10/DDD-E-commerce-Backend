// test/helpers/in-memory-idempotency-keys-repository.ts
import type { IdempotencyKeysRepository } from "#/application/repositories/idempotency-keys.repository.js";
import { ConflictError } from "#/shared/errors/domain-error.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";

export class InMemoryIdempotencyKeysRepository implements IdempotencyKeysRepository {
  private keys = new Map<string, { handlerName: string }>();

  async create(
    id: string,
    handlerName: string,
    _tx: TransactionClient,
  ): Promise<void> {
    if (this.keys.has(id)) {
      throw new ConflictError("IdempotencyKey", id, "already exists");
    }
    this.keys.set(id, { handlerName });
  }

  // ── Test helpers ──

  hasKey(id: string): boolean {
    return this.keys.has(id);
  }

  getKey(id: string): { handlerName: string } | undefined {
    return this.keys.get(id);
  }

  clear(): void {
    this.keys.clear();
  }
}
