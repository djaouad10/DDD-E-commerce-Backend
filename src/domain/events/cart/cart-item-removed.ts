import type { DomainEvent } from "../domain-event.js";

export class CartItemRemoved implements DomainEvent {
  readonly eventType = "cart.item-removed";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly itemId: string,
  ) {}
}
