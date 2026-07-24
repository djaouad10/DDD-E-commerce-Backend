import type { OrderStatus } from "#/domain/entities/order.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type { OrderSearchResultDTO } from "../dto/order.dto.js";

export type OrderSearchCriteria = {
  userId: UserId;
  limit: number;
  status?: OrderStatus;
  cursor?: { orderId: string; createdAt: Date };
};

export type OrderQueries = {
  search: (criteria: OrderSearchCriteria) => Promise<{
    orders: OrderSearchResultDTO[];
    nextCursor?: { orderId: string; createdAt: Date } | undefined;
  }>;
};
