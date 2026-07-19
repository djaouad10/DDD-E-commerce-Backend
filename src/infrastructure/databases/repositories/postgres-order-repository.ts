import type { Order } from "#/domain/entities/order.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import type { OrderId } from "#/domain/value-objects/order-id.js";
import {
  type DrizzleDBClient,
  type DrizzleTransactionClient,
} from "#/infrastructure/config/database.js";
import { eq } from "drizzle-orm";
import { order, orderItem } from "../schema.js";
import {
  PostgresOrderMapper,
  type OrderItemRow,
  type OrderRow,
  type OrderWithItemsRow,
} from "../mappers/postgres-order-mapper.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";
import { handleDrizzleErrors } from "../utils.js";
import { createLogger } from "#/shared/logging/logger.js";

export class PostgresOrderRepository implements OrderRepository {
  private logger = createLogger("PostgresOrderRepository");
  constructor(private db: DrizzleDBClient) {}

  async find(orderId: OrderId): Promise<Order | null> {
    this.logger.debug("find called", { id: orderId.value });

    try {
      const orderWithItemsRow: OrderWithItemsRow | undefined =
        await this.logger.measure("db.query.order.findFirst", () =>
          this.db.query.order.findFirst({
            where: eq(order.id, orderId.value),
            with: { order_items: true },
          }),
        );

      if (!orderWithItemsRow) {
        this.logger.debug("order not found", { id: orderId.value });

        return null;
      }

      const orderToReturn = PostgresOrderMapper.toDomain(orderWithItemsRow);

      this.logger.debug("find completed", {
        id: orderId.value,
        order: orderToReturn.toSnapshot(),
      });

      return orderToReturn;
    } catch (error) {
      this.logger.error("find failed", error as Error, { id: orderId.value });

      handleDrizzleErrors(error, "PostgresOrderRepository.find");
    }
  }

  async findMany(ids: OrderId[]): Promise<Order[]> {
    if (ids.length === 0) return [];

    try {
      const manyOrdersWithItemsRows: OrderWithItemsRow[] =
        await this.db.query.order.findMany({
          where: (order, { inArray }) =>
            inArray(
              order.id,
              ids.map((id) => id.value),
            ),
          with: { order_items: true },
        });

      return manyOrdersWithItemsRows.map(PostgresOrderMapper.toDomain);
    } catch (error) {
      handleDrizzleErrors(error, "PostgresCategoryRepository.findMany");
    }
  }

  async save(orderAgg: Order, tx?: TransactionClient): Promise<void> {
    const db = (tx as DrizzleTransactionClient | undefined) ?? this.db;

    // had to name it orderAgg because order is a reserved keyword for the schema table
    const orderRow: OrderRow = PostgresOrderMapper.toRow(orderAgg);
    const orderItemsRows: OrderItemRow[] =
      PostgresOrderMapper.toOrderItemsRows(orderAgg);

    // onConflictDoUpdate will update the createdAt timestamp, so we don't include it in the "set" clause
    const { created_at, ...orderRowToUpsert } = orderRow;

    try {
      await db.transaction(async (tx) => {
        await tx
          .insert(order)
          .values(orderRow)
          .onConflictDoUpdate({
            target: [order.id],
            set: orderRowToUpsert,
          });

        await tx.delete(orderItem).where(eq(orderItem.orderId, orderRow.id));

        if (orderItemsRows.length > 0) {
          await tx.insert(orderItem).values(orderItemsRows);
        }
      });
    } catch (error) {
      handleDrizzleErrors(error, "PostgresOrderRepository.save");
    }
  }

  async delete(id: OrderId, tx?: TransactionClient): Promise<void> {
    const db = (tx as DrizzleTransactionClient | undefined) ?? this.db;

    try {
      // order items will be deleted automatically (on delete cascade)
      await db.delete(order).where(eq(order.id, id.value));
    } catch (error) {
      handleDrizzleErrors(error, "PostgresOrderRepository.delete");
    }
  }
}
