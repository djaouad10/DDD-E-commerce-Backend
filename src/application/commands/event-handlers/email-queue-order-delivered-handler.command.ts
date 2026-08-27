import type { ShippingProvider } from "#/domain/entities/order.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";

export class EmailQueueOrderDeliveredHandlerCommand {
  constructor(
    public readonly eventType: typeof DomainEventCode.ORDER_DELIVERED,
    public readonly occurredOn: Date,
    public readonly aggregateId: string,
    public readonly userId: string,
    public readonly deliveredAt: Date,
    public readonly selectedShippingProvider: ShippingProvider,
  ) {}
}
