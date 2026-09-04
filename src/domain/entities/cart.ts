import type { CartSnapshot } from "#/domain/entities-snapshots/cart.snapshot.js";
import {
  NotFoundError,
  ValidationError,
} from "#/shared/errors/domain-error.js";
import { CartCleared } from "../events/cart/cart-cleared.js";
import { CartItemAdded } from "../events/cart/cart-item-added.js";
import { CartItemQtyUpdated } from "../events/cart/cart-item-qty-updated.js";
import { CartItemRemoved } from "../events/cart/cart-item-removed.js";
import type { DomainEvent } from "../events/domain-event.js";
import { CartId } from "../value-objects/cart-id.js";
import type { CartItemId } from "../value-objects/cart-item-id.js";
import type { UserId } from "../value-objects/user-id.js";
import type { CartItem } from "./cart-item.js";

export class Cart {
  private _events: DomainEvent[] = [];

  private constructor(
    readonly id: CartId, // for equality checks or event sourcing since it's regenrated on every load, rely on userId instead
    readonly userId: UserId,
    private _items: CartItem[],
    private _updatedAt: Date,
  ) {}

  // factory
  static create(userId: UserId, items: CartItem[]): Cart {
    if (new Set(items.map((item) => item.id.value)).size !== items.length)
      throw new ValidationError(
        "cart.items",
        "can't create a cart with duplicate items",
      );

    return new Cart(CartId.generate(), userId, items, new Date());
  }

  // reconstitute
  static reconstitute(id: CartId, userId: UserId, items: CartItem[]): Cart {
    if (new Set(items.map((item) => item.id.value)).size !== items.length)
      throw new ValidationError(
        "cart.items",
        "can't reconstitute a cart with duplicate items",
      );

    const updatedAt = items.reduce((prev, curr) => {
      return prev > curr.getUpdatedAt() ? prev : curr.getUpdatedAt();
    }, new Date());

    return new Cart(id, userId, items, updatedAt);
  }

  // command methods
  addItem(item: CartItem): void {
    if (this._items.find((i) => i.variationId.equals(item.variationId)))
      throw new ValidationError("variationId", "variation already in cart");

    if (this._items.length >= 50)
      throw new ValidationError(
        "cart.items",
        "cart is full, cannot add more than 50 items",
      );

    this._items.push(item);
    this._updatedAt = new Date();

    this._events.push(
      new CartItemAdded(
        this.id.value,
        this.userId.value,
        item.id.value,
        item.variationId.value,
        item.getQty(),
      ),
    );
  }

  removeItem(itemId: CartItemId): void {
    if (!this._items.find((i) => i.id.equals(itemId)))
      throw new NotFoundError("cart.item", itemId.value);

    this._items = this._items.filter((i) => !i.id.equals(itemId));
    this._updatedAt = new Date();

    this._events.push(
      new CartItemRemoved(this.id.value, this.userId.value, itemId.value),
    );
  }

  updateItemQty(itemId: CartItemId, newQty: number): void {
    const targetItem = this._items.find((i) => i.id.equals(itemId));

    if (!targetItem) throw new ValidationError("itemId", "item not found");

    targetItem.updateQty(newQty);
    this._updatedAt = new Date();

    this._events.push(
      new CartItemQtyUpdated(
        this.id.value,
        this.userId.value,
        targetItem.id.value,
        targetItem.getQty(),
        newQty,
      ),
    );
  }

  clear(): void {
    if (this._items.length === 0) return;

    this._items = [];
    this._updatedAt = new Date();

    this._events.push(new CartCleared(this.id.value, this.userId.value));
  }

  // query methods
  getItems(): CartItem[] {
    return this._items;
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

  toSnapshot(): CartSnapshot {
    return {
      id: this.id.value,
      userId: this.userId.value,
      items: this._items.map((i) => i.toSnapshot()),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
