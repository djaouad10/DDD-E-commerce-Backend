import type { ShippingProvider } from "#/domain/entities/order.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import type { Currency } from "#/domain/value-objects/money.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

export class EmailQueueOrderCreatedHandlerCommand {
  constructor(
    public readonly eventType: typeof DomainEventCode.ORDER_CREATED,
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
          "orderCreated.occurredOn",
          "must be in the past",
        );
      }
  
      if (this.itemCount <= 0) {
        throw new ValidationError(
          "orderCreated.itemCount",
          "must be greater than 0",
        );
      }
  
      if (this.totalPrice <= 0) {
        throw new ValidationError(
          "orderCreated.totalPrice",
          "must be greater than 0",
        );
      }
    }
}
