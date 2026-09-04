import type { OrderSearchResultDTO } from "#/application/dto/order.dto.js";
import type { GetOrdersOfClientQuery } from "#/application/queries/get-orders-of-client.query.js";
import type {
  OrderCursor,
  OrderQueries,
} from "#/application/read-models/order.queries.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { createLogger } from "#/shared/logging/logger.js";

export class GetOrdersOfClientService {
  private logger = createLogger("GetOrdersOfClientService");

  constructor(private orderQueries: OrderQueries) {}

  async execute(query: GetOrdersOfClientQuery): Promise<{
    orders: OrderSearchResultDTO[];
    nextCursor?: OrderCursor | undefined;
  }> {
    this.logger.info("GetOrdersOfClientService.execute called", {
      clientId: query.clientId,
    });

    const { clientId, limit, cursor, status } = query;

    // I skipped checking if client exists for a faster endpoint, since it only makes one DB roundtrip now. if client doesn't exist, we still get a 200 status with empty array, u can modify the behavior later

    return this.orderQueries.search({
      limit,
      userId: UserId.of(clientId),
      ...(cursor && { cursor }),
      ...(status && { status }),
    });
  }
}
