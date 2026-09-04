import type { ShippingProvider } from "#/domain/entities/order.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

export class EmailQueueOrderDeliveredHandlerCommand {
  constructor(
    public readonly eventType: typeof DomainEventCode.ORDER_DELIVERED,
    public readonly occurredOn: Date,
    public readonly aggregateId: string,
    public readonly userId: string,
    public readonly deliveredAt: Date,
    public readonly selectedShippingProvider: ShippingProvider,
  ) {
    this.validate();
  }

  private validate() {
    if (this.occurredOn > new Date()) {
      throw new ValidationError(
        "orderDelivered.occurredOn",
        "must be in the past",
      );
    }

    if (this.deliveredAt > new Date()) {
      throw new ValidationError(
        "orderDelivered.deliveredAt",
        "must be in the past",
      );
    }
  }
}
