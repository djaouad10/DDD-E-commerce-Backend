import type { OrderSearchResultDTO } from "#/application/dto/order.dto.js";
import type {
  OrderCursor,
  OrderQueries,
  OrderSearchCriteria,
} from "#/application/read-models/order.queries.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { createLogger } from "#/shared/logging/logger.js";
import { handleDrizzleErrors } from "#/shared/errors/handle-drizzle-errors.js";
export class PostgresOrderQueries implements OrderQueries {
  private logger = createLogger("PostgresOrderQueries");

  constructor(private db: DrizzleDBClient) {}

  async search(criteria: OrderSearchCriteria): Promise<{
    orders: OrderSearchResultDTO[];
    nextCursor?: OrderCursor | undefined;
  }> {
    this.logger.debug("search called", { criteria });

    const { limit, userId, cursor, status } = criteria;

    try {
      const orderRows = await this.logger.measure(
        "db.query.order.findMany",
        () =>
          this.db.query.order.findMany({
            where: (order, { eq, gt, and, or }) => {
              // build conditions directly no array push with or() since the or clause returns a sql<unknown> | undefined, while "and, get,... etc." return sql<unknown>, so we can't push them to the same array

              const userFilter = userId
                ? eq(order.user_id, userId.value)
                : undefined;
              const statusFilter = status
                ? eq(order.status, status)
                : undefined;

              if (!cursor) {
                return and(userFilter, statusFilter);
              }

              return and(
                statusFilter,
                userFilter,
                // composite cursor pagination means you use one attribute mainly as the cursor and the other attribute as a tie breaker when more than one row has the same value of the main attribute
                or(
                  gt(order.created_at, cursor.createdAt),
                  and(
                    eq(order.created_at, cursor.createdAt),
                    gt(order.id, cursor.orderId),
                  ),
                ),
              );
            },
            orderBy: (order, { asc }) => [asc(order.created_at), asc(order.id)],
            limit: limit + 1,
            columns: {
              id: true,
              user_id: true,
              tracking_number: true,
              status: true,
              shipping_status: true,
              shipping_price_at_order_time: true,
              selected_shipping_provider: true,
              created_at: true,
              updated_at: true,
            },
          }),
      );

      const hasNextPage = orderRows.length > limit;

      const rowsToReturn = hasNextPage ? orderRows.slice(0, limit) : orderRows;

      const ordersToReturn: OrderSearchResultDTO[] = rowsToReturn.map(
        (row) => ({
          id: row.id,
          userId: row.user_id,
          trackingNumber: row.tracking_number,
          status: row.status,
          shippingStatus: row.shipping_status,
          shippingPriceAtOrderTime: {
            amount: row.shipping_price_at_order_time,
            currency: "DZD",
          },
          selectedShippingProvider: row.selected_shipping_provider,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
        }),
      );

      const nextCursor: OrderCursor | undefined = hasNextPage
        ? {
            orderId: rowsToReturn[limit - 1]!.id,
            createdAt: rowsToReturn[limit - 1]!.created_at,
          }
        : undefined;

      this.logger.debug("search completed", {
        ordersCount: ordersToReturn.length,
      });

      return { orders: ordersToReturn, nextCursor };
    } catch (error) {
      this.logger.error("search failed", error as Error, { criteria });

      handleDrizzleErrors(error, "PostgresOrderQueries.search");
    }
  }
}
