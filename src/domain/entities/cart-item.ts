import type { CartItemSnapshot } from "#/application/dto/cart-item.dto.js";
import { ValidationError } from "#/shared/errors/domain-error.js";
import type { DomainEvent } from "../events/domain-event.js";
import { CartItemId } from "../value-objects/cart-item-id.js";
import type { VariationId } from "../value-objects/variation-id.js";

export class CartItem {
  private _events: DomainEvent[] = [];
  private constructor(
    readonly id: CartItemId,
    readonly variationId: VariationId,
    private _qty: number,
    private _updatedAt: Date,
  ) {}

  // factory
  static create(variationId: VariationId, qty: number): CartItem {
    if (qty <= 0) throw new ValidationError("qty", "must be greater than 0");

    return new CartItem(CartItemId.generate(), variationId, qty, new Date());
  }

  // reconstitution
  static reconstitute(
    id: CartItemId,
    variationId: VariationId,
    qty: number,
    updatedAt: Date,
  ): CartItem {
    if (qty <= 0) throw new ValidationError("qty", "must be greater than 0");

    return new CartItem(id, variationId, qty, updatedAt);
  }

  // command methods
  updateQty(newQty: number): void {
    if (newQty <= 0)
      throw new ValidationError("newQty", "must be greater than 0");

    this._qty = newQty;
    this._updatedAt = new Date();
  }

  //   query methods
  getQty(): number {
    return this._qty;
  }

  getUpdatedAt(): Date {
    return this._updatedAt;
  }

  // event methods
  pullEvents(): DomainEvent[] {
    const events = [...this._events];
    this._events = [];
    return events;
  }
  peekEvents(): readonly DomainEvent[] {
    return [...this._events];
  }

  // mappers
  toSnapshot(): CartItemSnapshot {
    return {
      id: this.id.value,
      variationId: this.variationId.value,
      qty: this._qty,
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
