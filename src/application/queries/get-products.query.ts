import { ValidationError } from "#/shared/errors/domain-error.js";
import type { ProductCursor } from "../read-models/product.queries.js";

export class GetProductsQuery {
  constructor(
    public readonly limit: number,
    public readonly categoryId?: string,
    public readonly cursor?: ProductCursor,
    public readonly max_price?: number,
    public readonly min_price?: number,
  ) {
    this.validate(limit, max_price, min_price);
  }

  private validate(limit: number, max_price?: number, min_price?: number) {
    if (limit <= 0) {
      throw new ValidationError("limit", "limit must be greater than 0");
    }

    if (max_price && min_price && max_price <= min_price) {
      throw new ValidationError(
        "max_price",
        "max_price must be greater than min_price",
      );
    }

    if (max_price && max_price < 0) {
      throw new ValidationError(
        "max_price",
        "max_price must be greater than 0",
      );
    }

    if (min_price && min_price < 0) {
      throw new ValidationError(
        "min_price",
        "min_price must be greater than 0",
      );
    }
  }
}
