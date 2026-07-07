import type { DomainEvent } from "../domain-event.js";

export class OrderCancelled implements DomainEvent {
  readonly eventType = "order.cancelled";
  readonly occurredOn: Date = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
  ) {}
}
