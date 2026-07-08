import type { DomainEvent } from "../domain-event.js";

export class OrderCreated implements DomainEvent {
  readonly eventType = "order.created";
  readonly occurredOn: Date = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly itemCount: number,
    readonly totalPrice: number,
    readonly currency: string,
    readonly selectedShippingProvider: string,
  ) {}
}
