import type { ShippingProvider } from "#/domain/entities/order.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import type { Currency } from "#/domain/value-objects/money.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

export class EmailQueueOrderConfirmedHandlerCommand {
  constructor(
    public readonly eventType: typeof DomainEventCode.ORDER_CONFIRMED,
    public readonly occurredOn: Date,
    public readonly aggregateId: string,
    public readonly userId: string,
    public readonly itemCount: number,
    public readonly totalPrice: number,
    public readonly currency: Currency,
    public readonly selectedShippingProvider: ShippingProvider,
  ) {
    this.validate();
  }

  private validate() {
    if (this.occurredOn > new Date()) {
      throw new ValidationError(
        "orderConfirmed.occurredOn",
        "must be in the past",
      );
    }

    if (this.itemCount <= 0) {
      throw new ValidationError(
        "orderConfirmed.itemCount",
        "must be greater than 0",
      );
    }

    if (this.totalPrice <= 0) {
      throw new ValidationError(
        "orderConfirmed.totalPrice",
        "must be greater than 0",
      );
    }
  }
}
