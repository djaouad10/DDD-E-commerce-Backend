import type { CategoryId } from "#/domain/value-objects/category-id.js";
import type { Money } from "#/domain/value-objects/money.js";
import type { ProductId } from "#/domain/value-objects/product-id.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
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

export type ProductCursor = { productId: string; createdAt: Date };

export type ProductSearchCriteria = {
  limit: number;
  categoryId?: CategoryId;
  cursor?: ProductCursor;
  max_price?: Money;
  min_price?: Money;
};

export type ProductQueries = {
  search: (criteria: ProductSearchCriteria) => Promise<{
    products: ProductSearchDTO[];
    nextCursor?: ProductCursor | undefined;
  }>;

  // requires an aggregate
  getStaticData: (productId: ProductId) => Promise<ProductStaticDataDTO | null>;

  getLowStock: (
    limit: number,
    threshold: number,
    cursor?: ProductCursor,
  ) => Promise<{
    products: ProductLowStockDTO[];
    nextCursor?: ProductCursor | undefined;
  }>;

  findVariations: (productId: ProductId) => Promise<VariationDTO[]>;

  // doesn't require an aggregate
  findVariationsWithCartItems: (
    productId: ProductId,
    userId: UserId,
  ) => // each variation of the product and any cart itemId associated with it in current user's cart
  // we need it to check if the variation is already in cart within single product page so we can disable the add to cart button
  Promise<VariationWithCartItemDTO[]>;

  findVariation: (variationId: VariationId) => Promise<VariationDTO | null>;
};
