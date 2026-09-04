import type { Color, Size } from "#/domain/entities/product.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

export class CreateVariationOfProductCommand {
  constructor(
    public readonly productId: string,
    public readonly data: {
      size: Size;
      color: Color;
      totalQty: number;
      weightInGrams: number;
    },
  ) {
    this.validate();
  }

  private validate() {
    if (this.data.totalQty < 0)
      throw new ValidationError(
        "product.variation.totalQty",
        "must be greater than 0",
      );

    if (this.data.weightInGrams <= 0)
      throw new ValidationError(
        "product.variation.weightInGrams",
        "must be greater than 0",
      );
  }
}
