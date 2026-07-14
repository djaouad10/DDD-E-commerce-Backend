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
      const orderRow: OrderWithItemsRow | undefined =
        await db.query.order.findFirst({
          where: eq(order.id, orderId.value),
          with: { order_items: true },
        });

      if (!orderRow) {
        return null;
      }

      return PostgresOrderMapper.toDomain(orderRow);
    } catch (error) {
      throw new DatabaseError(
        error instanceof Error ? error.message : "Unknown database error",
        "PostgresOrderRepository.find",
        error,
      );
    }
  }
}
