import type { Order } from "#/domain/entities/order.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import type { OrderId } from "#/domain/value-objects/order-id.js";
import { type DrizzleDBClient } from "#/infrastructure/config/database.js";
import { eq } from "drizzle-orm";
import { order, orderItem } from "../schema.js";
import {
  PostgresOrderMapper,
  type OrderItemRow,
  type OrderRow,
  type OrderWithItemsRow,
} from "../mappers/postgres-order-mapper.js";
import { DatabaseError } from "#/shared/errors/domain-error.js";

export class PostgresOrderRepository implements OrderRepository {
  constructor(private db: DrizzleDBClient) {}

  async find(orderId: OrderId): Promise<Order | null> {
    try {
      const orderWithItemsRow: OrderWithItemsRow | undefined =
        await this.db.query.order.findFirst({
          where: eq(order.id, orderId.value),
          with: { order_items: true },
        });

      if (!orderWithItemsRow) {
        return null;
      }

      return PostgresOrderMapper.toDomain(orderWithItemsRow);
    } catch (error) {
      throw new DatabaseError(
        error instanceof Error ? error.message : "Unknown database error",
        "PostgresOrderRepository.find",
        error,
      );
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
      throw new DatabaseError(
        error instanceof Error ? error.message : "Unknown database error",
        "PostgresOrderRepository.findMany",
        error,
      );
    }
  }

  async save(orderAgg: Order): Promise<void> {
    // had to name it orderAgg because order is a reserved keyword for the schema table
    const orderRow: OrderRow = PostgresOrderMapper.toRow(orderAgg);
    const orderItemsRows: OrderItemRow[] =
      PostgresOrderMapper.toOrderItemsRows(orderAgg);

    // onConflictDoUpdate will update the createdAt timestamp, so we don't include it in the "set" clause
    const { created_at, ...orderRowToUpsert } = orderRow;

    try {
      await this.db.transaction(async (tx) => {
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
      throw new DatabaseError(
        error instanceof Error ? error.message : "Unknown database error",
        "PostgresOrderRepository.save",
        error,
      );
    }
  }

  async delete(id: OrderId): Promise<void> {
    try {
      // order items will be deleted automatically (on delete cascade)
      await this.db.delete(order).where(eq(order.id, id.value));
    } catch (error) {
      throw new DatabaseError(
        error instanceof Error ? error.message : "Unknown database error",
        "PostgresOrderRepository.delete",
        error,
      );
    }
  }
}
