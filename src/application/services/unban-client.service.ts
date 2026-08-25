import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { UnbanClientCommand } from "../commands/unban-client.command.js";
import type { OutboxRepository } from "../repositories/outbox.repository.js";

export class UnbanClientService {
  private logger = createLogger("UnbanClientService");

  constructor(
    private db: DrizzleDBClient,
    private userRepository: UserRepository,
    private outboxReposiotory: OutboxRepository,
  ) {}

  async execute(command: UnbanClientCommand): Promise<void> {
    this.logger.info(`UnbanClientService.execute called`, { command });

    const clientId = UserId.of(command.clientId);

    const user = await this.userRepository.find(clientId);

    if (!user) throw new NotFoundError("user", clientId.value);

    if (!user.isBanned()) return; // so we don't get duplicate events

    user.unBan();

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
