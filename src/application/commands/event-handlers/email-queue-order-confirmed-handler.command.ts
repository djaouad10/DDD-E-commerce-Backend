import type { ShippingProvider } from "#/domain/entities/order.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import type { Currency } from "#/domain/value-objects/money.js";

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
  ) {}
}
