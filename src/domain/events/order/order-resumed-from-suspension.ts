import type { DomainEvent } from "../domain-event.js";

export class OrderResumedFromSuspension implements DomainEvent {
  readonly eventType = "order.resumed-from-suspension";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
  ) {}
}
