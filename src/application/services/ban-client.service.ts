import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { BanClientCommand } from "../commands/ban-client.command.js";
import type { OutboxRepository } from "../repositories/outbox.repository.js";

export class BanClientService {
  private logger = createLogger("BanClientService");

  constructor(
    private db: DrizzleDBClient,
    private userRepository: UserRepository,
    private outboxReposiotory: OutboxRepository,
  ) {}

  async execute(command: BanClientCommand): Promise<void> {
    this.logger.info(`BanClientService.execute called`, { command });

    const clientId = UserId.of(command.clientId);
    const { banExpiresInSeconds, reason } = command;

    const user = await this.userRepository.find(clientId);

    if (!user) throw new NotFoundError("user", clientId.value);

    const banExpiryDate = banExpiresInSeconds
      ? new Date(Date.now() + banExpiresInSeconds * 1000)
      : undefined;

    user.ban(reason, banExpiryDate);

    const events = user.pullEvents();

    this.logger.debug("Saving user", { id: user.id.value });
    await this.db.transaction(async (tx) => {
      await this.userRepository.save(user, tx);

      if (events.length > 0) {
        this.logger.debug("Saving events", { count: events.length });
        await this.outboxReposiotory.saveEvents(events, tx);
      }
    });
  }
}
