import type { CategoryId } from "#/domain/value-objects/category-id.js";
import type { Money } from "#/domain/value-objects/money.js";
import type { ProductId } from "#/domain/value-objects/product-id.js";
import type { VariationId } from "#/domain/value-objects/variation-id.js";
import type { ProductDTO } from "../dto/product.dto.js";
import type { VariationDTO } from "../dto/variation.dto.js";

export type ProductSearchCriteria = {
  limit: number;
  categoryId?: CategoryId;
  cursor?: ProductId;
  max_price?: Money;
  min_price?: Money;
};

export type ProductQueries = {
  search: (
    criteria: ProductSearchCriteria,
  ) => Promise<{ products: ProductDTO[]; nextCursor?: ProductId }>;

  getStaticData: (productId: ProductId) => Promise<ProductDTO[]>;

  getLowStock: (
    limit: number,
    cursor?: ProductId,
  ) => Promise<{ products: ProductDTO[]; nextCursor?: ProductId }>;

  findVariations: (productId: ProductId) => Promise<VariationDTO[]>;

  findVariationsWithCartItems: (
    productId: ProductId,
  ) => Promise<VariationDTO[]>;

  findVariation: (variationId: VariationId) => Promise<VariationDTO | null>;
};
