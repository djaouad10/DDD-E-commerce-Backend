import { ProductId } from "#/domain/value-objects/product-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { VariationWithCartItemDTO } from "../dto/variation.dto.js";
import type { GetProductVariationsWithCartFlagQuery } from "../queries/get-product-variations-with-cart-flag.query.js";
import type { ProductQueries } from "../read-models/product.queries.js";

export class GetProductVariationsWithCartFlagService {
  private logger = createLogger("GetProductVariationsWithCartFlagService");

  constructor(private productQueries: ProductQueries) {}

  async execute(
    query: GetProductVariationsWithCartFlagQuery,
  ): Promise<VariationWithCartItemDTO[]> {
    this.logger.info(`GetProductVariationsWithCartFlagService.execute called`);

    return this.productQueries.findVariationsWithCartItems(
      ProductId.of(query.productId),
      UserId.of(query.userId),
    );
  }
}
