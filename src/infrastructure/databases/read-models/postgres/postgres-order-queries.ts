import type { OrderSearchResultDTO } from "#/application/dto/order.dto.js";
import type {
  OrderCursor,
  OrderQueries,
  OrderSearchCriteria,
} from "#/application/read-models/order.queries.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import { createLogger } from "#/shared/logging/logger.js";
import { handleDrizzleErrors } from "#/shared/errors/handle-drizzle-errors.js";
import type { VariationId } from "#/domain/value-objects/variation-id.js";
import { order, orderItem, variation } from "../../schema.js";
import { asc, eq } from "drizzle-orm";
import type { ProductId } from "#/domain/value-objects/product-id.js";
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

  async getFirstOrderWithItemOfVariation(
    variationId: VariationId,
  ): Promise<OrderSearchResultDTO | null> {
    this.logger.debug("getFirstOrderWithItemOfVariation called", {
      variationId,
    });

    try {
      const [orderRow] = await this.logger.measure(
        "db.select.from.orderItem.join.order",
        () =>
          this.db
            .select({
              order: {
                id: order.id,
                user_id: order.user_id,
                tracking_number: order.tracking_number,
                status: order.status,
                shipping_status: order.shipping_status,
                shipping_price_at_order_time:
                  order.shipping_price_at_order_time,
                selected_shipping_provider: order.selected_shipping_provider,
                created_at: order.created_at,
                updated_at: order.updated_at,
              },
            })
            .from(orderItem)
            .innerJoin(order, eq(orderItem.orderId, order.id))
            .where(eq(orderItem.variation_id, variationId.value))
            .orderBy(asc(order.created_at))
            .limit(1),
      );

      if (!orderRow) {
        this.logger.debug("order not found", {
          variationId: variationId.value,
        });

        return null;
      }

      const orderToReturn: OrderSearchResultDTO = {
        id: orderRow.order.id,
        userId: orderRow.order.user_id,
        trackingNumber: orderRow.order.tracking_number,
        status: orderRow.order.status,
        shippingStatus: orderRow.order.shipping_status,
        shippingPriceAtOrderTime: {
          amount: orderRow.order.shipping_price_at_order_time,
          currency: "DZD",
        },
        selectedShippingProvider: orderRow.order.selected_shipping_provider,
        createdAt: orderRow.order.created_at.toISOString(),
        updatedAt: orderRow.order.updated_at.toISOString(),
      };

      this.logger.debug("getFirstOrderWithItemOfVariation completed", {
        order: orderToReturn,
      });

      return orderToReturn;
    } catch (error) {
      this.logger.error(
        "getFirstOrderWithItemOfVariation failed",
        error as Error,
        { variationId: variationId.value },
      );

      handleDrizzleErrors(
        error,
        "PostgresOrderQueries.getFirstOrderWithItemOfVariation",
      );
    }
  }

  async getFirstOrderWithItemOfProduct(
    productId: ProductId,
  ): Promise<OrderSearchResultDTO | null> {
    this.logger.debug("getFirstOrderWithItemOfProduct called", {
      productId,
    });

    try {
      const [orderRow] = await this.logger.measure(
        "db.select.from.orderItem.join.variation",
        () =>
          this.db
            .select({
              order: {
                id: order.id,
                user_id: order.user_id,
                tracking_number: order.tracking_number,
                status: order.status,
                shipping_status: order.shipping_status,
                shipping_price_at_order_time:
                  order.shipping_price_at_order_time,
                selected_shipping_provider: order.selected_shipping_provider,
                created_at: order.created_at,
                updated_at: order.updated_at,
              },
            })
            .from(orderItem)
            .innerJoin(variation, eq(orderItem.variation_id, variation.id))
            .innerJoin(order, eq(orderItem.orderId, order.id))
            .where(eq(variation.product_id, productId.value))
            .orderBy(asc(order.created_at))
            .limit(1),
      );

      if (!orderRow) {
        this.logger.debug("order not found", {
          productId: productId.value,
        });

        return null;
      }

      const orderToReturn: OrderSearchResultDTO = {
        id: orderRow.order.id,
        userId: orderRow.order.user_id,
        trackingNumber: orderRow.order.tracking_number,
        status: orderRow.order.status,
        shippingStatus: orderRow.order.shipping_status,
        shippingPriceAtOrderTime: {
          amount: orderRow.order.shipping_price_at_order_time,
          currency: "DZD",
        },
        selectedShippingProvider: orderRow.order.selected_shipping_provider,
        createdAt: orderRow.order.created_at.toISOString(),
        updatedAt: orderRow.order.updated_at.toISOString(),
      };

      this.logger.debug("getFirstOrderWithItemOfProduct completed", {
        order: orderToReturn,
      });

      return orderToReturn;
    } catch (error) {
      this.logger.error(
        "getFirstOrderWithItemOfProduct failed",
        error as Error,
        { productId: productId.value },
      );

      handleDrizzleErrors(
        error,
        "PostgresOrderQueries.getFirstOrderWithItemOfProduct",
      );
    }
  }
}
