import { createLogger } from "#/shared/logging/logger.js";
import type { ResetStuckOutboxRowsCommand } from "../../commands/stuck-outbox-resetter/reset-stuck-outbox-rows.command.js";
import { type OutboxRepository } from "../../repositories/outbox.repository.js";

export class ResetStuckOutboxRowsService {
  private logger = createLogger("ResetStuckOutboxRowsService");

  constructor(private outboxRepository: OutboxRepository) {}

  async execute(command: ResetStuckOutboxRowsCommand): Promise<void> {
    this.logger.info("ResetStuckOutboxRowsService.execute called", { command });

    const stuckRows = await this.outboxRepository.getStuckRows(
      command.batchSize,
      command.stuckBefore,
    );

    if (stuckRows.length === 0) {
      this.logger.info("No stuck rows found, nothing to reset");
      return;
    }

    for (const row of stuckRows) {
      try {
        await this.outboxRepository.updateRowToPending({
          id: row.id,
          scheduledAt: row.scheduledAt,
          errorMessage: row.errorMessage ?? "row stuck",
        });
      } catch (error) {
        // next poll cycle will try again this row
        this.logger.error("Failed to reset stuck row", error as Error, { row });
        continue;
      }
    }

    this.logger.info("Reset stuck rows complete", { count: stuckRows.length });
  }
}
