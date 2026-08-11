import { ProductId } from "#/domain/value-objects/product-id.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { GetProductVariationsQuery } from "../queries/get-product-variations.query.js";
import type { ProductQueries } from "../read-models/product.queries.js";

export class GetProductVariationsService {
  private logger = createLogger("GetProductVariationsService");

  constructor(private productQueries: ProductQueries) {}

  async execute(query: GetProductVariationsQuery) {
    this.logger.info(`GetProductVariationsService.execute called`);

    const productId = ProductId.of(query.productId);

    return this.productQueries.findVariations(productId);
  }
}
