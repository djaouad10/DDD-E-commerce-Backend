// test/helpers/in-memory-idempotency-keys-repository.ts
import type {
  IdempotencyKeyEntry,
  IdempotencyKeysRepository,
} from "#/application/ports/persistence/idempotency-keys.repository.port.js";
import { ConflictError } from "#/shared/errors/domain-error.js";

export class InMemoryIdempotencyKeysRepository implements IdempotencyKeysRepository {
  private keys = new Map<string, { handlerName: string; payload?: unknown }>();

  async create(key: string, handlerName: string): Promise<void> {
    if (this.keys.has(key)) {
      throw new ConflictError("IdempotencyKey", key, "already exists");
    }
    this.keys.set(key, { handlerName });
  }

  async find(key: string): Promise<IdempotencyKeyEntry | null> {
    return this.keys.get(key)
      ? {
          handlerName: this.keys.get(key)!.handlerName,
          payload: this.keys.get(key)!.payload,
          id: key,
          createdAt: new Date(),
        }
      : null;
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
