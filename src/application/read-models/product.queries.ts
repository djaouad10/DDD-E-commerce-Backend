import type { CategoryId } from "#/domain/value-objects/category-id.js";
import type { Money } from "#/domain/value-objects/money.js";
import type { ProductId } from "#/domain/value-objects/product-id.js";
import type { VariationId } from "#/domain/value-objects/variation-id.js";
import type {
  ProductLowStockDTO,
  ProductSearchDTO,
  ProductStaticDataDTO,
} from "../dto/product.dto.js";
import type {
  VariationDTO,
  VariationWithCartItemDTO,
} from "../dto/variation.dto.js";

export type ProductSearchCriteria = {
  limit: number;
  categoryId?: CategoryId;
  cursor?: ProductId;
  max_price?: Money;
  min_price?: Money;
};

export type ProductQueries = {
  // doesn't require an aggregate
  search: (
    criteria: ProductSearchCriteria,
  ) => Promise<{ products: ProductSearchDTO[]; nextCursor?: ProductId }>;

  // requires an aggregate
  getStaticData: (productId: ProductId) => Promise<ProductStaticDataDTO[]>;

  // doesn't require an aggregate
  getLowStock: (
    limit: number,
    cursor?: ProductId,
  ) => Promise<{ products: ProductLowStockDTO[]; nextCursor?: ProductId }>;

  // doesn't require an aggregate
  findVariations: (productId: ProductId) => Promise<VariationDTO[]>;

  // doesn't require an aggregate
  findVariationsWithCartItems: (
    productId: ProductId,
  ) => // each variation of the product and any cart itemId associated with it in current user's cart
  // we need it to check if the variation is already in cart within single product page so we can disable the add to cart button
  Promise<VariationWithCartItemDTO[]>;

  // doesn't require an aggregate
  findVariation: (variationId: VariationId) => Promise<VariationDTO | null>;
};
