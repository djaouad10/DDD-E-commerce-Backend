import type { DomainEvent } from "../domain-event.js";

export class OrderShippingDetailsUpdated implements DomainEvent {
  readonly eventType = "order.shipping-details-updated";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly selectedShippingProvider: string,
  ) {}
}
