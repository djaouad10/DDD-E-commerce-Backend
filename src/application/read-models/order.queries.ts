import type { OrderStatus } from "#/domain/entities/order.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type { OrderSearchResultDTO } from "../dto/order.dto.js";

export type OrderCursor = {
  orderId: string;
  createdAt: Date;
};

export type OrderSearchCriteria = {
  userId?: UserId;
  limit: number;
  status?: OrderStatus;
  cursor?: OrderCursor;
};

export type OrderQueries = {
  search: (criteria: OrderSearchCriteria) => Promise<{
    orders: OrderSearchResultDTO[];
    nextCursor?: OrderCursor | undefined;
  }>;
};
