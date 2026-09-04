import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import type { OutboxJobPayloadType } from "#/infrastructure/messaging/jobs/validation.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { DBClient } from "#/shared/types/db-client.js";
import type { UpdateShippingDetailsCommand } from "../../commands/api/update-shipping-details.command.js";
import {
  OutboxAction,
  type OutboxRepository,
} from "../../ports/persistence/outbox.repository.port.js";

export class UpdateShippingDetailsService {
  private logger = createLogger("UpdateShippingDetailsService");

  constructor(
    private db: DBClient,
    private orderRepository: OrderRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: UpdateShippingDetailsCommand): Promise<void> {
    this.logger.info("UpdateShippingDetailsService.execute called", {
      command,
    });

    const orderId = OrderId.of(command.orderId);

    const order = await this.orderRepository.find(orderId);

    if (!order) throw new NotFoundError("order", orderId.value);

    order.updateShippingDetails(command.data);

    const events = order.pullEvents();

    this.logger.debug("Saving events", { count: events.length });
    await this.db.transaction(async (tx) => {
      await Promise.all([
        this.orderRepository.save(order, tx),
        this.outboxRepository.saveEvents(events, tx),
      ]);

      const payload: OutboxJobPayloadType<
        typeof OutboxAction.UPDATE_ORDER_IN_SHIPPING_API
      > = { orderId: orderId.value };

      await this.outboxRepository.saveJob(
        { action: OutboxAction.UPDATE_ORDER_IN_SHIPPING_API, payload },
        tx,
      );
    });
  }
}
