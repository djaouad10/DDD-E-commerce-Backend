import type { OrderStatus } from "#/domain/entities/order.js";
import { ValidationError } from "#/shared/errors/domain-error.js";
import type { OrderCursor } from "../read-models/order.queries.js";

export class GetOrdersOfClientQuery {
  constructor(
    public readonly clientId: string,
    public readonly limit: number,
    public readonly cursor?: OrderCursor,
    public readonly status?: OrderStatus,
  ) {
    this.validate();
  }

  private validate() {
    if (this.limit <= 0) {
      throw new ValidationError("limit", "limit must be greater than 0");
    }
  }
}
