import type { EmailQueueOrderConfirmedHandlerCommand } from "#/application/commands/email-queue-handlers/email-queue-order-confirmed-handler.command.js";
import type { IdempotencyKeysRepository } from "#/application/ports/persistence/idempotency-keys.repository.port.js";
import type { EmailGateway } from "#/domain/gateways/email.gateway.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { buildOrderConfirmedEmailTemplate } from "#/infrastructure/notifications/templates/order-confirmed.email.template.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { DBClient } from "#/shared/types/db-client.js";

export class EmailQueueOrderConfirmedHandlerService {
  private logger = createLogger("EmailQueueOrderConfirmedHandlerService");

  constructor(
    private db: DBClient,
    private emailGateway: EmailGateway,
    private userRepository: UserRepository,
    private orderRepository: OrderRepository,
    private idempotencyKeysRepository: IdempotencyKeysRepository,
  ) {}

  async execute(
    command: EmailQueueOrderConfirmedHandlerCommand,
    jobId: string,
  ): Promise<void> {
    this.logger.info("EmailQueueOrderConfirmedHandlerService.execute called");

    const { userId, aggregateId: orderId, ...data } = command;

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
    const orderConfirmedEmailTemplate = buildOrderConfirmedEmailTemplate({
      orderId: command.aggregateId,
      ...data,
    });

    await this.db.transaction(async (tx) => {
      // if job was already processed this will throw unique constraint violation error
      await this.idempotencyKeysRepository.create(
        jobId,
        "EmailQueueOrderConfirmedHandlerService",
        tx,
      );
      await this.emailGateway.sendEmail(
        user.email,
        "Order Confirmed",
        orderConfirmedEmailTemplate,
      );
    });
  }
}
