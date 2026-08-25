import { ProductId } from "#/domain/value-objects/product-id.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { ProductStaticDataDTO } from "../dto/product.dto.js";
import type { GetProductStaticDataQuery } from "../queries/get-product-static-data.query.js";
import type { ProductQueries } from "../read-models/product.queries.js";

export class GetProductStaticDataService {
  private logger = createLogger("GetProductStaticDataService");

  constructor(private productQueries: ProductQueries) {}

  async execute(
    query: GetProductStaticDataQuery,
  ): Promise<ProductStaticDataDTO> {
    this.logger.info(`GetProductStaticDataService.execute called`);

    const product = await this.productQueries.getStaticData(
      ProductId.of(query.productId),
    );

    if (!product) throw new NotFoundError("product", query.productId);

    return product;
  }
}
