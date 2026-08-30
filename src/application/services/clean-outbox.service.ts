import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { CleanOutboxCommand } from "../commands/clean-outbox.command.js";
import type { IdempotencyKeysRepository } from "../repositories/idempotency-keys.repository.js";
import type { OutboxRepository } from "../repositories/outbox.repository.js";

export class CleanOutboxService {
  private logger = createLogger("CleanOutboxService");

  constructor(
    private db: DrizzleDBClient,
    private outboxRepository: OutboxRepository,
    private idempotencyKeysRepository: IdempotencyKeysRepository,
  ) {}

  async execute(command: CleanOutboxCommand, jobId: string): Promise<void> {
    this.logger.info("CleanOutboxService.execute called", { command, jobId });

    await this.db.transaction(async (tx) => {
      // create idempotency key first with this jobId to make sure it wasn't successfully processed before
      await this.idempotencyKeysRepository.create(
        jobId,
        "CleanOutboxService",
        tx,
      );

      await this.outboxRepository.deleteCompletedRows(command.olderThan, tx);
    });
  }
}
