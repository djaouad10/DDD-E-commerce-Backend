import type { VariationSnapshot } from "#/domain/entities-snapshots/variation.snapshot.js";
import { ValidationError } from "#/shared/errors/domain-error.js";
import type { DomainEvent } from "../events/domain-event.js";
import { VariationId } from "../value-objects/variation-id.js";
import { Weight } from "../value-objects/weight.js";
import type { Color, Size } from "./product.js";

export class Variation {
  private _availableQty: number;
  private _isInStock: boolean;

  private _events: DomainEvent[] = [];

  private constructor(
    readonly id: VariationId,
    private _size: Size,
    private _color: Color,
    private _totalQty: number,
    private _reservedQty: number,
    private _weightInGrams: Weight,
    private _createdAt: Date,
    private _updatedAt: Date,
  ) {
    this._availableQty = this._totalQty - this._reservedQty;
    this._isInStock = this._availableQty > 0;
  }

  //   factory
  static create(
    size: Size,
    color: Color,
    totalQty: number,
    reservedQty: number,
    weightInGrams: Weight,
  ): Variation {
    if (weightInGrams.unit !== "g")
      throw new ValidationError("variation.weightInGrams.unit", "must be grams");

    // validation here then:
    const now = new Date();

    return new Variation(
      VariationId.generate(),
      size,
      color,
      totalQty,
      reservedQty,
      weightInGrams,
      now,
      now,
    );
  }

  // reconstitute
  static reconstitute(
    id: VariationId,
    size: Size,
    color: Color,
    totalQty: number,
    reservedQty: number,
    weightInGrams: Weight,
    createdAt: Date,
    updatedAt: Date,
  ): Variation {
    if (weightInGrams.unit !== "g")
      throw new ValidationError("variation.weightInGrams.unit", "must be grams");

    return new Variation(
      id,
      size,
      color,
      totalQty,
      reservedQty,
      weightInGrams,
      createdAt,
      updatedAt,
    );
  }

  // command methods
  updateTotalQty(newTotalQty: number): void {
    if (newTotalQty < 0)
      throw new ValidationError("newTotalQty", "can not be negative");

    if (newTotalQty < this._reservedQty) {
      throw new ValidationError(
        "newTotalQty",
        "must be equal or greater than existing reserved qty",
      );
    }

    this._totalQty = newTotalQty;
    this._availableQty = this._totalQty - this._reservedQty;
    this._isInStock = this._availableQty > 0;

    this._updatedAt = new Date();
  }

  updateWeight(newWeight: Weight) {
    if (newWeight.unit !== "g")
      throw new ValidationError("newWeight.unit", "must be grams");

    this._weightInGrams = newWeight;
    this._updatedAt = new Date();
  }

  reserve(qty: number): void {
    if (qty <= 0) throw new ValidationError("qty", "must be greater than 0");
    if (qty > this._availableQty)
      throw new ValidationError("qty", "insufficient available stock");

    this._reservedQty += qty;
    this._availableQty = this._totalQty - this._reservedQty;
    this._isInStock = this._availableQty > 0;
    this._updatedAt = new Date();
  }

  release(qty: number): void {
    if (qty <= 0) throw new ValidationError("qty", "must be greater than 0");
    if (qty > this._reservedQty)
      throw new ValidationError("qty", "cannot release more than reserved");

    this._reservedQty -= qty;
    this._availableQty = this._totalQty - this._reservedQty;
    this._isInStock = this._availableQty > 0;
    this._updatedAt = new Date();
  }

  // query methods
  getSize(): Size {
    return this._size;
  }

  getColor(): Color {
    return this._color;
  }

  getWeight(): Weight {
    return this._weightInGrams;
  }

  getTotalQty(): number {
    return this._totalQty;
  }

  getReservedQty(): number {
    return this._reservedQty;
  }

  getAvailableQty(): number {
    return this._availableQty;
  }

  isInStock(): boolean {
    return this._isInStock;
  }

  getCreatedAt(): Date {
    return this._createdAt;
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
  toSnapshot(): VariationSnapshot {
    return {
      id: this.id.value,
      size: this._size,
      color: this._color,
      totalQty: this._totalQty,
      reservedQty: this._reservedQty,
      availableQty: this._availableQty,
      isInStock: this._isInStock,
      weightInGrams: this._weightInGrams.toSnapshot(),
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  // private helpers
}
