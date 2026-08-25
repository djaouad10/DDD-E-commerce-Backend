import type { OrderStatus } from "#/domain/entities/order.js";
import { ValidationError } from "#/shared/errors/domain-error.js";
import type { OrderCursor } from "../read-models/order.queries.js";

export class GetOrdersQuery {
  constructor(
    public readonly limit: number,
    public readonly status?: OrderStatus,
    public readonly cursor?: OrderCursor,
  ) {
    this.validate(limit);
  }

  private validate(limit: number) {
    if (limit <= 0) {
      throw new ValidationError("limit", "limit must be greater than 0");
    }
  }
}
