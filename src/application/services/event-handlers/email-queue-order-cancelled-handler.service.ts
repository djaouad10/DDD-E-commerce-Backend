import type { EmailQueueOrderCancelledHandlerCommand } from "#/application/commands/event-handlers/email-queue-order-cancelled-handler.command.js";
import type { IdempotencyKeysRepository } from "#/application/repositories/idempotency-keys.repository.js";
import type { EmailGateway } from "#/domain/gateways/email.gateway.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { buildOrderCancelledEmailTemplate } from "#/infrastructure/notifications/templates/order-cancelled.email.template.js";

import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";

export class EmailQueueOrderCancelledHandlerService {
  private logger = createLogger("EmailQueueOrderCancelledHandlerService");

  constructor(
    private db: DrizzleDBClient,
    private emailGateway: EmailGateway,
    private userRepository: UserRepository,
    private orderRepository: OrderRepository,
    private idempotencyKeysRepository: IdempotencyKeysRepository,
  ) {}

  async execute(
    command: EmailQueueOrderCancelledHandlerCommand,
    jobId: string,
  ): Promise<void> {
    this.logger.info("EmailQueueOrderCancelledHandlerService.execute called");

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

    const orderCancelledEmailTemplate = buildOrderCancelledEmailTemplate({
      orderSnapshot: order.toSnapshot(),
      cancelledAt: command.occurredOn,
    });

    await this.db.transaction(async (tx) => {
      // if job was already processed this will throw unique constraint violation error
      await this.idempotencyKeysRepository.create(
        jobId,
        "EmailQueueOrderCancelledHandlerService",
        tx,
      );

      await this.emailGateway.sendEmail(
        user.email,
        "Order Cancelled",
        orderCancelledEmailTemplate,
      );
    });
  }
}
