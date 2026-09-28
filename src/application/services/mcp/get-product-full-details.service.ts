import type { ProductFullDetailsDTO } from "#/application/dto/product.dto.js";
import type { GetProductFullDetailsQuery } from "#/application/queries/get-product-full-details.query.js";
import type { ProductQueries } from "#/application/read-models/product.queries.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { NotFoundError } from "#/shared/errors/errors.js";
import { createLogger } from "#/shared/logging/logger.js";

export class GetProductFullDetailsService {
  private logger = createLogger("GetProductFullDetailsService");

  constructor(private productQueries: ProductQueries) {}

  async execute(
    query: GetProductFullDetailsQuery,
  ): Promise<ProductFullDetailsDTO> {
    this.logger.info(`GetProductFullDetailsService.execute called`, { query });

    const productId = ProductId.of(query.productId);

    const product = await this.productQueries.getStaticData(productId);

    if (!product) throw new NotFoundError("product", query.productId);

    const variations = await this.productQueries.findVariations(productId);

    this.logger.debug("GetProductFullDetailsService.execute completed", {
      productId: product.id,
      variationsCount: variations.length,
    });

    return {
      ...product,
      variations: variations.map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        availableQty: v.availableQty,
        weightInGrams: v.weightInGrams.weight,
      })),
    };
  }
}
