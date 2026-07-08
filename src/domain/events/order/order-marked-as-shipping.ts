import type { DomainEvent } from "../domain-event.js";

export class OrderMarkedAsShipping implements DomainEvent {
  readonly eventType = "order.marked-as-shipping";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly trackingNumber: string,
  ) {}
}
