import type {
  IdempotencyKeyEntry,
  IdempotencyKeysRepository,
} from "#/application/repositories/idempotency-keys.repository.js";

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
    key: string,
    handlerName: string,
    tx: TransactionClient,
    payload: unknown,
  ): Promise<void> {
    this.logger.debug("create called", { key, handlerName });

    const db = tx as DrizzleTransactionClient;

    try {
      await this.logger.measure("db.insert(idempotencyKeys)", () =>
        db
          .insert(idempotencyKeys)
          .values({ id: key, handler_name: handlerName, payload }),
      );

      this.logger.debug("create completed", { key, handlerName });
    } catch (error) {
      this.logger.error("create failed", error as Error, { key, handlerName });

      handleDrizzleErrors(error, "PostgresIdempotencyKeysRepository.create");
    }
  }

  async find(
    key: string,
    tx: TransactionClient,
  ): Promise<IdempotencyKeyEntry | null> {
    this.logger.debug("find called", { key });

    const db = tx as DrizzleTransactionClient;

    try {
      const idempotencyKeyRow = await this.logger.measure(
        "db.query.idempotencyKeys.findFirst",
        () =>
          db.query.idempotencyKeys.findFirst({
            where: (idempotencyKeys, { eq }) => eq(idempotencyKeys.id, key),
          }),
      );

      if (!idempotencyKeyRow) {
        this.logger.debug("idempotency key not found", { key });
        return null;
      }

      const idempotencyKeyEntry: IdempotencyKeyEntry = {
        id: idempotencyKeyRow.id,
        handlerName: idempotencyKeyRow.handler_name,
        payload: idempotencyKeyRow.payload,
        createdAt: idempotencyKeyRow.created_at,
      };

      this.logger.debug("find completed", { idempotencyKeyEntry });
      return idempotencyKeyEntry;
    } catch (error) {
      this.logger.error("find failed", error as Error, { key });

      handleDrizzleErrors(error, "PostgresIdempotencyKeysRepository.find");
    }
  }
}
