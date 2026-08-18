import type { Size, Color } from "#/domain/entities/product.js";
import { ValidationError } from "#/shared/errors/domain-error.js";

export class CreateProductCommand {
  constructor(
    public readonly name: string,
    public readonly description: string | null,
    public readonly brand: string,
    public readonly material: string,
    public readonly price: number,
    public readonly discount_price: number | null,
    public readonly mainImage: {
      name: string;
      public_url: string;
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
    this.validate(price, discount_price, variations);
  }

  private validate(
    price: number,
    discount_price: number | null,
    variations: {
      size: Size;
      color: Color;
      totalQty: number;
      weightInGrams: number;
    }[],
  ) {
    if (price < 0) {
      throw new ValidationError("product.price", "must be greater than 0");
    }

    if (discount_price !== null && discount_price < 0) {
      throw new ValidationError(
        "product.discount_price",
        "must be greater than 0",
      );
    }

    if (discount_price !== null && discount_price >= price) {
      throw new ValidationError(
        "product.discount_price",
        "must be less than price",
      );
    }

    for (const variation of variations) {
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
