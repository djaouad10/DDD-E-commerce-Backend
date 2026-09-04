import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import type { OutboxJobPayloadType } from "#/infrastructure/messaging/jobs/validation.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { ConfirmOrderCommand } from "../../commands/api/confirm-order.command.js";
import {
  OutboxAction,
  type OutboxRepository,
} from "../../repositories/outbox.repository.js";

export class ConfirmOrderService {
  private logger = createLogger("ConfirmOrderService");

  constructor(
    private db: DrizzleDBClient,
    private orderRepository: OrderRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: ConfirmOrderCommand): Promise<void> {
    this.logger.info("ConfirmOrderService.execute called", { command });

    const orderId = OrderId.of(command.orderId);

    const order = await this.orderRepository.find(orderId);

    if (!order) throw new NotFoundError("order", orderId.value);

    order.confirm();

    const events = order.pullEvents();

    this.logger.debug("Saving order", { id: order.id.value });
    await this.db.transaction(async (tx) => {
      await Promise.all([
        this.orderRepository.save(order, tx),
        this.outboxRepository.saveEvents(events, tx),
      ]);

      const payload: OutboxJobPayloadType<
        typeof OutboxAction.CREATE_ORDER_IN_SHIPPING_API
      > = { orderId: order.id.value };

      await this.outboxRepository.saveJob(
        {
          action: OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
          payload,
        },
        tx,
      );
    });
  }
}
