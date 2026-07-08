import type { DomainEvent } from "../domain-event.js";

export class CartCleared implements DomainEvent {
  readonly eventType = "cart.cleared";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
  ) {}
}
