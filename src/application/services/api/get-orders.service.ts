import type { OrderSearchResultDTO } from "#/application/dto/order.dto.js";
import type {
  OrderCursor,
  OrderQueries,
} from "#/application/read-models/order.queries.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { GetOrdersQuery } from "../../queries/get-orders.query.js";

export class GetOrdersService {
  private logger = createLogger("GetOrdersService");

  constructor(private orderQueries: OrderQueries) {}

  async execute(query: GetOrdersQuery): Promise<{
    orders: OrderSearchResultDTO[];
    nextCursor?: OrderCursor | undefined;
  }> {
    this.logger.info("GetOrdersService.execute called", {
      query,
    });

    const { limit, cursor, status } = query;

    return this.orderQueries.search({
      limit,
      ...(cursor && { cursor }),
      ...(status && { status }),
    });
  }
}
