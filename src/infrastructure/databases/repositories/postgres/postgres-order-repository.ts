import type { Order } from "#/domain/entities/order.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import type { OrderId } from "#/domain/value-objects/order-id.js";
import {
  type DrizzleDBClient,
  type DrizzleTransactionClient,
} from "#/infrastructure/config/database.js";
import { eq } from "drizzle-orm";
import { order, orderItem } from "../../schema.js";
import {
  PostgresOrderMapper,
  type OrderItemRow,
  type OrderRow,
  type OrderWithItemsRow,
} from "../../mappers/postgres/postgres-order-mapper.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";
import { handleDrizzleErrors } from "#/shared/errors/handle-drizzle-errors.js";
import { createLogger } from "#/shared/logging/logger.js";

export class PostgresOrderRepository implements OrderRepository {
  private logger = createLogger("PostgresOrderRepository");

  constructor(private db: DrizzleDBClient) {}

  async find(orderId: OrderId, tx?: TransactionClient): Promise<Order | null> {
    this.logger.debug("find called", { id: orderId.value });

    const db = tx ? (tx as DrizzleTransactionClient) : this.db;

    try {
      const orderWithItemsRow: OrderWithItemsRow | undefined =
        await this.logger.measure("db.query.order.findFirst", () =>
          db.query.order.findFirst({
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

  async findByTracking(
    trackingNumber: string,
    tx?: TransactionClient,
  ): Promise<Order | null> {
    this.logger.debug("findByTracking called", { trackingNumber });

    const db = tx ? (tx as DrizzleTransactionClient) : this.db;

    try {
      const orderWithItemsRow: OrderWithItemsRow | undefined =
        await this.logger.measure("db.query.order.findFirst", () =>
          db.query.order.findFirst({
            where: eq(order.tracking_number, trackingNumber),
            with: { order_items: true },
          }),
        );

      if (!orderWithItemsRow) {
        this.logger.debug("order not found", { trackingNumber });

        return null;
      }

      const orderToReturn = PostgresOrderMapper.toDomain(orderWithItemsRow);

      this.logger.debug("findByTracking completed", {
        trackingNumber,
        order: orderToReturn.toSnapshot(),
      });

      return orderToReturn;
    } catch (error) {
      this.logger.error("findByTracking failed", error as Error, {
        trackingNumber,
      });

      handleDrizzleErrors(error, "PostgresOrderRepository.findByTracking");
    }
  }

  async findMany(ids: OrderId[]): Promise<Order[]> {
    this.logger.debug("findMany called");

    if (ids.length === 0) {
      this.logger.debug("findMany completed");

      return [];
    }

    try {
      const manyOrdersWithItemsRows: OrderWithItemsRow[] =
        await this.logger.measure("db.query.order.findMany", () =>
          this.db.query.order.findMany({
            where: (order, { inArray }) =>
              inArray(
                order.id,
                ids.map((id) => id.value),
              ),
            with: { order_items: true },
          }),
        );

      const ordersToReturn = manyOrdersWithItemsRows.map(
        PostgresOrderMapper.toDomain,
      );

      this.logger.debug("findMany completed", {
        ordersCount: ordersToReturn.length,
      });

      return ordersToReturn;
    } catch (error) {
      this.logger.error("findMany failed", error as Error);

      handleDrizzleErrors(error, "PostgresCategoryRepository.findMany");
    }
  }

  async save(orderAgg: Order, tx: TransactionClient): Promise<void> {
    this.logger.debug("save called", { id: orderAgg.id.value });

    const db = tx as DrizzleTransactionClient;

    // had to name it orderAgg because order is a reserved keyword for the schema table
    const orderRow: OrderRow = PostgresOrderMapper.toRow(orderAgg);
    const orderItemsRows: OrderItemRow[] =
      PostgresOrderMapper.toOrderItemsRows(orderAgg);

    // onConflictDoUpdate will update the createdAt timestamp, so we don't include it in the "set" clause
    const { created_at, ...orderRowToUpsert } = orderRow;

    try {
      // already in a transaction orchestrated by application service
      await this.logger.measure("db.insert(order)", () =>
        db
          .insert(order)
          .values(orderRow)
          .onConflictDoUpdate({
            target: [order.id],
            set: orderRowToUpsert,
          }),
      );

      await this.logger.measure("db.delete(orderItem)", () =>
        db.delete(orderItem).where(eq(orderItem.orderId, orderRow.id)),
      );

      if (orderItemsRows.length > 0) {
        await this.logger.measure("db.insert(orderItem)", () =>
          db.insert(orderItem).values(orderItemsRows),
        );
      }

      this.logger.debug("save completed", { id: orderAgg.id.value });
    } catch (error) {
      this.logger.error("save failed", error as Error, {
        id: orderAgg.id.value,
      });

      handleDrizzleErrors(error, "PostgresOrderRepository.save");
    }
  }

  async delete(id: OrderId, tx: TransactionClient): Promise<void> {
    this.logger.debug("delete called", { id: id.value });

    const db = tx as DrizzleTransactionClient;

    try {
      // order items will be deleted automatically (on delete cascade)
      await this.logger.measure("db.delete(order)", () =>
        db.delete(order).where(eq(order.id, id.value)),
      );

      this.logger.debug("delete completed", { id: id.value });
    } catch (error) {
      this.logger.error("delete failed", error as Error, { id: id.value });

      handleDrizzleErrors(error, "PostgresOrderRepository.delete");
    }
  }
}
