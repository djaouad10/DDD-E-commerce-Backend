import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import { NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { GetOrderByTrackingNumberQuery } from "../queries/get-order-by-tracking-number.query.js";

export class GetOrderByTrackingNumberService {
  private logger = createLogger("GetOrderByTrackingNumberService");

  constructor(private orderRepository: OrderRepository) {}

  async execute(query: GetOrderByTrackingNumberQuery) {
    this.logger.info("GetOrderByTrackingNumberService.execute called");

    const order = await this.orderRepository.findByTracking(
      query.trackingNumber,
    );

    if (!order) throw new NotFoundError("order", query.trackingNumber);

    return order.toSnapshot();
  }
}
