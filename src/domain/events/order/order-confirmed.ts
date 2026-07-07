import type { DomainEvent } from "../domain-event.js";

export class OrderConfirmed implements DomainEvent {
  readonly eventType = "order.confirmed";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly itemCount: number,
    readonly totalPrice: number,
    readonly currency: string,
  ) {}
}
