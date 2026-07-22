import type { OrderStatus } from "#/domain/entities/order.js";
import type { OrderId } from "#/domain/value-objects/order-id.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type { OrderSearchResultDTO } from "../dto/order.dto.js";

export type OrderSearchCriteria = {
  userId: UserId;
  limit: number;
  status?: OrderStatus;
  cursor?: OrderId;
};

export type OrderQueries = {
  // it does require aggregates loading
  search: (
    criteria: OrderSearchCriteria,
  ) => Promise<{
    orders: OrderSearchResultDTO[];
    nextCursor?: string | undefined;
  }>;
};
