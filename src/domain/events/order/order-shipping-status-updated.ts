import type { DomainEvent } from "../domain-event.js";

export class OrderShippingStatusUpdated implements DomainEvent {
  readonly eventType = "order.shipping-status-updated";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly shippingStatus: string,
    readonly previousStatus: string | null,
    readonly selectedShippingProvider: string,
  ) {}
}
