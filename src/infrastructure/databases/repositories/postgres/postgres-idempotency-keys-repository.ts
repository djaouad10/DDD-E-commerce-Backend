import type { IdempotencyKeysRepository } from "#/application/repositories/idempotency-keys.repository.js";

import type {
  DrizzleDBClient,
  DrizzleTransactionClient,
} from "#/infrastructure/config/database.js";
import { handleDrizzleErrors } from "#/shared/errors/handle-drizzle-errors.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";
import { idempotencyKeys } from "../../schema.js";

export class PostgresIdempotencyKeysRepository implements IdempotencyKeysRepository {
  private logger = createLogger("PostgresIdempotencyKeysRepository");

  constructor(private db: DrizzleDBClient) {}

  async create(
    id: string,
    handlerName: string,
    tx: TransactionClient,
  ): Promise<void> {
    this.logger.debug("create called", { id, handlerName });

    const db = tx as DrizzleTransactionClient;

    try {
      this.logger.measure("db.insert(idempotencyKeys)", () =>
        db.insert(idempotencyKeys).values({ id, handler_name: handlerName }),
      );

      this.logger.debug("create completed", { id, handlerName });
    } catch (error) {
      this.logger.error("create failed", error as Error, { id, handlerName });

      handleDrizzleErrors(error, "PostgresIdempotencyKeysRepository.create");
    }
  }
}
