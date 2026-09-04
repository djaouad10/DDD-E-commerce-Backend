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
    this.validate();
  }

  private validate() {
    if (this.limit <= 0) {
      throw new ValidationError("limit", "limit must be greater than 0");
    }

    if (this.max_price && this.min_price && this.max_price <= this.min_price) {
      throw new ValidationError(
        "max_price",
        "max_price must be greater than min_price",
      );
    }

    if (this.max_price && this.max_price < 0) {
      throw new ValidationError(
        "max_price",
        "max_price must be greater than 0",
      );
    }

    if (this.min_price && this.min_price < 0) {
      throw new ValidationError(
        "min_price",
        "min_price must be greater than 0",
      );
    }
  }
}
