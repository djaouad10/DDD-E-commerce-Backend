import type { OrderStatus } from "#/domain/entities/order.js";
import type { OrderCursor } from "../read-models/order.queries.js";

export class GetOrdersOfClientQuery {
  constructor(
    public readonly clientId: string,
    public readonly limit: number,
    public readonly cursor?: OrderCursor,
    public readonly status?: OrderStatus,
  ) {}
}
