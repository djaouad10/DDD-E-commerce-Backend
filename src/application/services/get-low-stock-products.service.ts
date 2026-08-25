import { createLogger } from "#/shared/logging/logger.js";
import type { ProductLowStockDTO } from "../dto/product.dto.js";
import type { GetLowStockProductsQuery } from "../queries/get-low-stock-products.query.js";
import type {
  ProductCursor,
  ProductQueries,
} from "../read-models/product.queries.js";

export class GetLowStockProductsService {
  private logger = createLogger("GetLowStockProductsService");

  constructor(private productQueries: ProductQueries) {}

  async execute(query: GetLowStockProductsQuery): Promise<{
    products: ProductLowStockDTO[];
    nextCursor?: ProductCursor | undefined;
  }> {
    this.logger.info(`GetLowStockProductsService.execute called`);
    const { limit, minStock, cursor } = query;

    return this.productQueries.getLowStock(limit, minStock, cursor);
  }
}
