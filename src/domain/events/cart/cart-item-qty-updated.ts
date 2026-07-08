import type { DomainEvent } from "../domain-event.js";

export class CartItemQtyUpdated implements DomainEvent {
  readonly eventType = "cart.item-qty-updated";
  readonly occurredOn = new Date();

  constructor(
    readonly aggregateId: string,
    readonly itemId: string,
    readonly previousQty: number,
    readonly newQty: number,
  ) {}
}
