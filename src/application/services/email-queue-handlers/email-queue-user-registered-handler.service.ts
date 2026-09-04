import type { EmailQueueUserRegisteredHandlerCommand } from "#/application/commands/email-queue-handlers/email-queue-user-registered-handler.command.js";
import type { IdempotencyKeysRepository } from "#/application/ports/persistence/idempotency-keys.repository.port.js";
import type { EmailGateway } from "#/domain/gateways/email.gateway.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { buildUserRegisteredEmailTemplate } from "#/infrastructure/notifications/templates/user-registered.email.template.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { DBClient } from "#/shared/types/db-client.js";

export class EmailQueueUserRegisteredHandlerService {
  private logger = createLogger("EmailQueueUserRegisteredHandlerService");

  constructor(
    private db: DBClient,
    private emailGateway: EmailGateway,
    private userRepository: UserRepository,
    private idempotencyKeysRepository: IdempotencyKeysRepository,
  ) {}

  async execute(
    command: EmailQueueUserRegisteredHandlerCommand,
    jobId: string,
  ): Promise<void> {
    this.logger.info("EmailQueueUserRegisteredHandlerService.execute called");

    const { aggregateId: userId } = command;

    const user = await this.userRepository.find(UserId.of(userId));

    if (!user) {
      this.logger.debug("User not found", { userId });
      throw new NotFoundError("user", userId);
    }

    const userRegisteredEmailTemplate = buildUserRegisteredEmailTemplate({
      userSnapshot: user.toSnapshot(),
    });

    await this.db.transaction(async (tx) => {
      // if job was already processed this will throw unique constraint violation error
      await this.idempotencyKeysRepository.create(
        jobId,
        "EmailQueueUserRegisteredHandlerService",
        tx,
      );

      await this.emailGateway.sendEmail(
        user.email,
        "Welcome to Shop",
        userRegisteredEmailTemplate,
      );
    });
  }
}
