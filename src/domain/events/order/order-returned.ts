import type { DomainEvent } from "../domain-event.js";

export class OrderReturned implements DomainEvent {
  readonly eventType = "order.returned";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly reason: string | null,
  ) {}
}
