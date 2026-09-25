import type { Color, Size } from "#/domain/entities/product.js";

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
  ) {}
}
