import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import type { OutboxJobPayloadType } from "#/infrastructure/messaging/jobs/validation.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { DBClient } from "#/shared/types/db-client.js";
import type { ShipOrderCommand } from "../../commands/api/ship-order-command.js";
import {
  OutboxAction,
  type OutboxRepository,
} from "../../ports/persistence/outbox.repository.port.js";

export class ShipOrderService {
  private logger = createLogger("ShipOrderService");

  constructor(
    private db: DBClient,
    private orderRepository: OrderRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: ShipOrderCommand): Promise<void> {
    this.logger.info(`Shipping order ${command.orderId}`);

    const orderId = OrderId.of(command.orderId);

    const order = await this.orderRepository.find(orderId);

    if (!order) throw new NotFoundError("order", orderId.value);

    const trackingNumber = order.getTrackingNumber(); // should be defined

    if (!trackingNumber)
      throw new NotFoundError("order.trackingNumber", orderId.value);

    order.markAsPreTransit();

    const events = order.pullEvents();

    this.logger.debug("Saving order", { id: order.id.value });
    await this.db.transaction(async (tx) => {
      await Promise.all([
        this.orderRepository.save(order, tx),
        this.outboxRepository.saveEvents(events, tx),
      ]);

      // trackingNumber should be defined
      const payload: OutboxJobPayloadType<
        typeof OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API
      > = { trackingNumber };

      await this.outboxRepository.saveJob(
        {
          action: OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API,
          payload,
        },
        tx,
      );
    });
  }
}
