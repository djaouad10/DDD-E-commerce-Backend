import type { DomainEvent } from "../domain-event.js";

export class OrderSuspended implements DomainEvent {
  readonly eventType = "order.suspended";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly previousStatus: string,
  ) {}
}
