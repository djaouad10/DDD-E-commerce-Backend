import type { OrderStatus } from "#/domain/entities/order.js";
import type { ProductId } from "#/domain/value-objects/product-id.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type { VariationId } from "#/domain/value-objects/variation-id.js";
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

  getFirstOrderWithItemOfVariation: (
    variationId: VariationId,
  ) => Promise<OrderSearchResultDTO | null>;

  getFirstOrderWithItemOfProduct: (
    productId: ProductId,
  ) => Promise<OrderSearchResultDTO | null>;
};
