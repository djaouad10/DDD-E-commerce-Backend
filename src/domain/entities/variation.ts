import { ValidationError } from "#/shared/errors/domain-error.js";
import { ProductId } from "../value-objects/product-id.js";
import { VariationId } from "../value-objects/variation-id.js";
import { Weight } from "../value-objects/weight.js";
import type { Color, Size } from "./product.js";

export class Variation {
  private available_qty: number;
  private is_in_stock: boolean;
  private constructor(
    readonly id: VariationId,
    readonly productId: ProductId,
    private size: Size,
    private color: Color,
    private total_qty: number,
    private reserved_qty: number,
    private weight_in_grams: Weight,
    private _createdAt: Date,
    private _updatedAt: Date,
  ) {
    this.available_qty = total_qty - reserved_qty;
    this.is_in_stock = this.available_qty > 0;
  }

  //   factory
  static(
    productId: ProductId,
    size: Size,
    color: Color,
    total_qty: number,
    reserved_qty: number,
    weight_in_grams: Weight,
  ): Variation {
    if (weight_in_grams.unit !== "g")
      throw new ValidationError("weight_in_grams.unit", "must be grams");

    // validation here then:
    const now = new Date();

    return new Variation(
      VariationId.generate(),
      productId,
      size,
      color,
      total_qty,
      reserved_qty,
      weight_in_grams,
      now,
      now,
    );
  }

  // reconstitute
  reconstitute(
    id: VariationId,
    productId: ProductId,
    size: Size,
    color: Color,
    total_qty: number,
    reserved_qty: number,
    weight_in_grams: Weight,
    createdAt: Date,
    updatedAt: Date,
  ): Variation {
    if (weight_in_grams.unit !== "g")
      throw new ValidationError("weight_in_grams.unit", "must be grams");

    return new Variation(
      id,
      productId,
      size,
      color,
      total_qty,
      reserved_qty,
      weight_in_grams,
      createdAt,
      updatedAt,
    );
  }

  // command methods

  // query methods
  getSize(): Size {
    return this.size;
  }

  getColor(): Color {
    return this.color;
  }

  getWeight(): Weight {
    return this.weight_in_grams;
  }

  getTotalQty(): number {
    return this.total_qty;
  }

  getReservedQty(): number {
    return this.reserved_qty;
  }

  getAvailableQty(): number {
    return this.available_qty;
  }

  isInStock(): boolean {
    return this.is_in_stock;
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
