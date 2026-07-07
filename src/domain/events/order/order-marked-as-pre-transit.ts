import type { DomainEvent } from "../domain-event.js";

export class OrderMarkedAsPreTransit implements DomainEvent {
  readonly eventType = "order.marked-as-pre-transit";
  readonly occurredOn = new Date();
  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly trackingNumber: string,
  ) {}
}
