import type { DomainEvent } from "../domain-event.js";

export class OrderDelivered implements DomainEvent {
  readonly eventType = "order.delivered";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly deliveredAt: Date,
  ) {}
}
