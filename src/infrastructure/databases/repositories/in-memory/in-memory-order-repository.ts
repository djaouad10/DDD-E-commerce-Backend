import type { Order } from "#/domain/entities/order.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import type { OrderId } from "#/domain/value-objects/order-id.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";

export class InMemoryOrderRepository implements OrderRepository {
  private orders: Order[] = [];

  async find(id: OrderId): Promise<Order | null> {
    return this.orders.find((order) => order.id.equals(id)) ?? null;
  }

  async findByTracking(trackingNumber: string): Promise<Order | null> {
    return (
      this.orders.find(
        (order) => order.getTrackingNumber() === trackingNumber,
      ) ?? null
    );
  }

  async findMany(ids: OrderId[]): Promise<Order[]> {
    return this.orders.filter((order) => ids.some((id) => id.equals(order.id)));
  }

  async save(order: Order, _tx?: TransactionClient): Promise<void> {
    const index = this.orders.findIndex((o) => o.id.equals(order.id));

    if (index >= 0) {
      this.orders[index] = order;
    } else {
      this.orders.push(order);
    }
  }

  async delete(id: OrderId, _tx?: TransactionClient): Promise<void> {
    this.orders = this.orders.filter((o) => !o.id.equals(id));
  }
}
