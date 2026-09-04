import { ValidationError } from "#/shared/errors/domain-error.js";
import type { ProductCursor } from "../read-models/product.queries.js";

export class GetLowStockProductsQuery {
  constructor(
    public readonly limit: number,
    public readonly minStock: number,
    public readonly cursor?: ProductCursor,
  ) {
    this.validate();
  }

  private validate() {
    if (this.limit <= 0) {
      throw new ValidationError("limit", "limit must be greater than 0");
    }

    if (this.minStock < 0) {
      throw new ValidationError("minStock", "minStock must be greater than 0");
    }
  }
}
