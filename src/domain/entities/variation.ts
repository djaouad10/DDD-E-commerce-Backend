import { ValidationError } from "#/shared/errors/domain-error.js";
import { ProductId } from "../value-objects/product-id.js";
import { VariationId } from "../value-objects/variation-id.js";
import { Weight } from "../value-objects/weight.js";
import type { Color, Size } from "./product.js";

export class Variation {
  private _availableQty: number;
  private _isInStock: boolean;
  private constructor(
    readonly id: VariationId,
    readonly productId: ProductId,
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
  static(
    productId: ProductId,
    _size: Size,
    _color: Color,
    _totalQty: number,
    _reservedQty: number,
    _weightInGrams: Weight,
  ): Variation {
    if (_weightInGrams.unit !== "g")
      throw new ValidationError("_weightInGrams.unit", "must be grams");

    // validation here then:
    const now = new Date();

    return new Variation(
      VariationId.generate(),
      productId,
      _size,
      _color,
      _totalQty,
      _reservedQty,
      _weightInGrams,
      now,
      now,
    );
  }

  // reconstitute
  reconstitute(
    id: VariationId,
    productId: ProductId,
    _size: Size,
    _color: Color,
    _totalQty: number,
    _reservedQty: number,
    _weightInGrams: Weight,
    createdAt: Date,
    updatedAt: Date,
  ): Variation {
    if (_weightInGrams.unit !== "g")
      throw new ValidationError("_weightInGrams.unit", "must be grams");

    return new Variation(
      id,
      productId,
      _size,
      _color,
      _totalQty,
      _reservedQty,
      _weightInGrams,
      createdAt,
      updatedAt,
    );
  }

  // command methods
  updateTotalQty(newTotalQty: number): void {
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

  // mappers

  // private helpers
}
