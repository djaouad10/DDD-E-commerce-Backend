import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { ForbiddenError, NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { UpdateClientProfileCommand } from "../commands/api/update-client-profile.command.js";
import type { OutboxRepository } from "../repositories/outbox.repository.js";

export class UpdateClientProfileService {
  private logger = createLogger("UpdateClientProfileService");

  constructor(
    private db: DrizzleDBClient,
    private userRepository: UserRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: UpdateClientProfileCommand) {
    this.logger.info("UpdateClientProfileService.execute called");

    const clientId = UserId.of(command.clientId);

    const user = await this.userRepository.find(clientId);

    if (!user) throw new NotFoundError("user", clientId.value);

    if (user.role !== "CLIENT")
      throw new ForbiddenError("update client profile", user.id.value);

    if (command.name !== undefined) user.updateName(command.name);

    if (command.image !== undefined) user.updateImage(command.image);

    const events = user.pullEvents();

    await this.db.transaction(async (tx) => {
      await Promise.all([
        this.userRepository.save(user, tx),
        this.outboxRepository.saveEvents(events, tx),
      ]);
    });
  }
}
