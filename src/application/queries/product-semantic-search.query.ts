import type { Color, Size } from "#/domain/entities/product.js";
import { ValidationError } from "#/shared/errors/errors.js";

export type SemanticSearchFilters = {
  colors?: Color[];
  sizes?: Size[];
  maxPrice?: number;
  minPrice?: number;
  inStock?: boolean;
};

export class ProductSemanticSearchQuery {
  constructor(
    public readonly query: string,
    public readonly limit?: number,
    public readonly filters?: SemanticSearchFilters,
  ) {
    this.validate();
  }

  private validate() {
    if (this.limit !== undefined && this.limit <= 0) {
      throw new ValidationError("limit", "limit must be greater than 0");
    }

    if (
      this.filters?.maxPrice !== undefined &&
      this.filters.minPrice !== undefined &&
      this.filters.maxPrice <= this.filters.minPrice
    ) {
      throw new ValidationError(
        "filters.maxPrice",
        "filters.maxPrice must be greater than filters.minPrice",
      );
    }

    if (this.filters?.maxPrice !== undefined && this.filters?.maxPrice <= 0) {
      throw new ValidationError(
        "filters.maxPrice",
        "filters.maxPrice must be greater than 0",
      );
    }

    if (this.filters?.minPrice !== undefined && this.filters?.minPrice < 0) {
      throw new ValidationError(
        "filters.minPrice",
        "filters.minPrice must be greater or equal to 0",
      );
    }

    if (!this.query) {
      throw new ValidationError("query", "query is required");
    }
  }
}
