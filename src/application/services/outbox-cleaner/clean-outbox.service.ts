import { createLogger } from "#/shared/logging/logger.js";
import type { DBClient } from "#/shared/types/db-client.js";
import type { CleanOutboxCommand } from "../../commands/outbox-cleaner/clean-outbox.command.js";
import type { OutboxRepository } from "../../ports/persistence/outbox.repository.port.js";

export class CleanOutboxService {
  private logger = createLogger("CleanOutboxService");

  constructor(
    private db: DBClient,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: CleanOutboxCommand): Promise<void> {
    this.logger.info("CleanOutboxService.execute called", { command });

    await this.db.transaction(async (tx) => {
      await this.outboxRepository.deleteCompletedRows(command.olderThan, tx);
    });
  }
}
