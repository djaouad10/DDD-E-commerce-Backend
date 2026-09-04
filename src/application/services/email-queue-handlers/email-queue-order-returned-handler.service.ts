import type { EmailQueueOrderReturnedHandlerCommand } from "#/application/commands/email-queue-handlers/email-queue-order-returned-handler.command.js";
import type { IdempotencyKeysRepository } from "#/application/ports/persistence/idempotency-keys.repository.port.js";
import type { EmailGateway } from "#/domain/gateways/email.gateway.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { buildOrderReturnedEmailTemplate } from "#/infrastructure/notifications/templates/order-returned.email.template.js";

import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";

export class EmailQueueOrderReturnedHandlerService {
  private logger = createLogger("EmailQueueOrderReturnedHandlerService");

  constructor(
    private db: DrizzleDBClient,
    private emailGateway: EmailGateway,
    private userRepository: UserRepository,
    private orderRepository: OrderRepository,
    private idempotencyKeysRepository: IdempotencyKeysRepository,
  ) {}

  async execute(
    command: EmailQueueOrderReturnedHandlerCommand,
    jobId: string,
  ): Promise<void> {
    this.logger.info("EmailQueueOrderReturnedHandlerService.execute called");

    const { userId, aggregateId: orderId } = command;

    const [user, order] = await Promise.all([
      this.userRepository.find(UserId.of(userId)),
      this.orderRepository.find(OrderId.of(orderId)),
    ]);

    if (!user) {
      this.logger.debug("User not found", { userId });
      throw new NotFoundError("user", userId);
    }

    if (!order) {
      this.logger.debug("Order not found", { orderId });
      throw new NotFoundError("order", orderId);
    }

    const orderReturnedEmailTemplate = buildOrderReturnedEmailTemplate({
      orderSnapshot: order.toSnapshot(),
      returnedAt: command.occurredOn,
    });

    await this.db.transaction(async (tx) => {
      // if job was already processed this will throw unique constraint violation error
      await this.idempotencyKeysRepository.create(
        jobId,
        "EmailQueueOrderReturnedHandlerService",
        tx,
      );

      await this.emailGateway.sendEmail(
        user.email,
        "Order Returned",
        orderReturnedEmailTemplate,
      );
    });
  }
}
