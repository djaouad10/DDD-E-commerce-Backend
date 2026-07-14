import type { Order } from "#/domain/entities/order.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import type { OrderId } from "#/domain/value-objects/order-id.js";
import { db } from "#/infrastructure/config/database.js";
import { eq } from "drizzle-orm";
import { order } from "../schema.js";
import {
  PostgresOrderMapper,
  type OrderWithItemsRow,
} from "../mappers/postgres-order-mapper.js";
import { DatabaseError } from "#/shared/errors/domain-error.js";

export class PostgresOrderRepository implements OrderRepository {
  async find(orderId: OrderId): Promise<Order | null> {
    try {
      const orderWithItemsRow: OrderWithItemsRow | undefined =
        await db.query.order.findFirst({
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
        await db.query.order.findMany({
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
}
