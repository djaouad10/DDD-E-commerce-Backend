import type { ShippingProvider } from "#/domain/entities/order.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";

export class EmailQueueOrderReturnedHandlerCommand {
  constructor(
    public readonly eventType: typeof DomainEventCode.ORDER_CONFIRMED,
    public readonly occurredOn: Date,
    public readonly aggregateId: string,
    public readonly userId: string,
    public readonly reason: string | null,
    public readonly selectedShippingProvider: ShippingProvider,
  ) {}
}
