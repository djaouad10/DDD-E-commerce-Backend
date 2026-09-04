import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { GetProductVariationsQuery } from "../../queries/get-product-variations.query.js";
import type { ProductQueries } from "../../read-models/product.queries.js";

export class GetProductVariationsService {
  private logger = createLogger("GetProductVariationsService");

  constructor(
    private productQueries: ProductQueries,
    private productRepository: ProductRepository,
  ) {}

  async execute(query: GetProductVariationsQuery) {
    this.logger.info(`GetProductVariationsService.execute called`);

    const productId = ProductId.of(query.productId);

    const product = await this.productRepository.find(productId);

    if (!product) throw new NotFoundError("product", query.productId);

    return this.productQueries.findVariations(productId);
  }
}
