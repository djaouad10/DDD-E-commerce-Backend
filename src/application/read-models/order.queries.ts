import type { OrderStatus } from "#/domain/entities/order.js";
import type { OrderId } from "#/domain/value-objects/order-id.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type { OrderDTO } from "../../domain/entities-snapshots/order.dto.js";

type OrderSearchCriteria = {
  userId: UserId;
  limit: number;
  status?: OrderStatus;
  cursor?: OrderId;
};

export type OrderQueries = {
  search: (
    criteria: OrderSearchCriteria,
  ) => Promise<{ orders: OrderDTO[]; nextCursor?: OrderId }>;
};
