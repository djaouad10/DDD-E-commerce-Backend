import type { EmailQueueOrderDeliveredHandlerCommand } from "#/application/commands/email-queue-handlers/email-queue-order-delivered-handler.command.js";
import type { IdempotencyKeysRepository } from "#/application/ports/persistence/idempotency-keys.repository.port.js";
import type { EmailGateway } from "#/domain/gateways/email.gateway.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { buildOrderDeliveredEmailTemplate } from "#/infrastructure/notifications/templates/order-delivered.email.template.js";

import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { DBClient } from "#/shared/types/db-client.js";

export class EmailQueueOrderDeliveredHandlerService {
  private logger = createLogger("EmailQueueOrderDeliveredHandlerService");

  constructor(
    private db: DBClient,
    private emailGateway: EmailGateway,
    private userRepository: UserRepository,
    private orderRepository: OrderRepository,
    private idempotencyKeysRepository: IdempotencyKeysRepository,
  ) {}

  async execute(
    command: EmailQueueOrderDeliveredHandlerCommand,
    jobId: string,
  ): Promise<void> {
    this.logger.info("EmailQueueOrderDeliveredHandlerService.execute called");

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

    const orderDeliveredEmailTemplate = buildOrderDeliveredEmailTemplate({
      orderSnapshot: order.toSnapshot(),
      deliveredAt: command.deliveredAt,
    });

    await this.db.transaction(async (tx) => {
      // if job was already processed this will throw unique constraint violation error
      await this.idempotencyKeysRepository.create(
        jobId,
        "EmailQueueOrderDeliveredHandlerService",
        tx,
      );

      await this.emailGateway.sendEmail(
        user.email,
        "Order Delivered",
        orderDeliveredEmailTemplate,
      );
    });
  }
}
