import type { DomainEvent } from "../domain-event.js";

export class CartItemAdded implements DomainEvent {
  readonly eventType = "cart.item-added";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly itemId: string,
    readonly variationId: string,
    readonly qty: number,
  ) {}
}
