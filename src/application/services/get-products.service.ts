import { CategoryId } from "#/domain/value-objects/category-id.js";
import { Money } from "#/domain/value-objects/money.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { ProductSearchDTO } from "../dto/product.dto.js";
import type { GetProductsQuery } from "../queries/get-products.query.js";
import type {
  ProductCursor,
  ProductQueries,
} from "../read-models/product.queries.js";

export class GetProductsService {
  private logger = createLogger("GetProductsService");

  constructor(private productQueries: ProductQueries) {}

  async execute(query: GetProductsQuery): Promise<{
    products: ProductSearchDTO[];
    nextCursor?: ProductCursor | undefined;
  }> {
    this.logger.info(`GetProductsService.execute called`);

    const { limit, categoryId, cursor, max_price, min_price } = query;

    return await this.productQueries.search({
      limit,
      ...(categoryId && { categoryId: CategoryId.of(categoryId) }),
      ...(cursor && { cursor }),
      ...(max_price && { max_price: Money.of(max_price, "DZD") }),
      ...(min_price && { min_price: Money.of(min_price, "DZD") }),
    });
  }
}
