import type { ShippingProvider } from "#/domain/entities/order.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

export class EmailQueueOrderReturnedHandlerCommand {
  constructor(
    public readonly eventType: typeof DomainEventCode.ORDER_RETURNED,
    public readonly occurredOn: Date,
    public readonly aggregateId: string,
    public readonly userId: string,
    public readonly reason: string | null,
    public readonly selectedShippingProvider: ShippingProvider,
  ) {
    this.validate();
  }

  private validate() {
    if (this.occurredOn > new Date()) {
      throw new ValidationError(
        "orderReturned.occurredOn",
        "must be in the past",
      );
    }
  }
}
