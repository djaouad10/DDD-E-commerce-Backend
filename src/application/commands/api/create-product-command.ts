import type { Size, Color } from "#/domain/entities/product.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

export class CreateProductCommand {
  constructor(
    public readonly name: string,
    public readonly description: string | null,
    public readonly brand: string,
    public readonly material: string,
    public readonly price: number,
    public readonly discountPrice: number | null,
    public readonly mainImage: {
      name: string;
      publicUrl: string;
      key: string;
    },
    public readonly variations: {
      size: Size;
      color: Color;
      totalQty: number;
      weightInGrams: number;
    }[],
    public readonly categoryId?: string,
  ) {
    this.validate();
  }

  private validate() {
    if (this.price < 0) {
      throw new ValidationError("product.price", "must be greater than 0");
    }

    if (this.discountPrice !== null && this.discountPrice < 0) {
      throw new ValidationError(
        "product.discountPrice",
        "must be greater than 0",
      );
    }

    if (this.discountPrice !== null && this.discountPrice >= this.price) {
      throw new ValidationError(
        "product.discountPrice",
        "must be less than price",
      );
    }

    for (const variation of this.variations) {
      if (variation.totalQty < 0)
        throw new ValidationError(
          "product.variation.totalQty",
          "must be greater than 0",
        );

      if (variation.weightInGrams <= 0)
        throw new ValidationError(
          "product.variation.weightInGrams",
          "must be greater than 0",
        );
    }
  }
}
