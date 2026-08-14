import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { ForbiddenError, NotFoundError } from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { OrderDTO, OrderItemDTO } from "../dto/order.dto.js";
import type { GetOrderByIdQuery } from "../queries/get-order-by-id.query.js";
import type { ProductQueries } from "../read-models/product.queries.js";

export class GetOrderByIdService {
  private logger = createLogger("GetOrderByIdService");

  constructor(
    private orderRepository: OrderRepository,
    private productQueries: ProductQueries,
  ) {}

  async execute(query: GetOrderByIdQuery): Promise<OrderDTO> {
    this.logger.info("GetOrderByIdService.execute called");

    const order = await this.orderRepository.find(OrderId.of(query.orderId));

    if (!order) throw new NotFoundError("order", query.orderId);

    // query.clientId is only defined if the user is a client, and clients are only allowed to get their own orders
    if (query.clientId && !order.userId.equals(UserId.of(query.clientId)))
      throw new ForbiddenError("get order by id", query.clientId);

    // I need to fetch the variations of each orderItem and include them in the result
    const variationIds = order.getOrderItems().map((oi) => oi.variationId);

    // this should be impossible since Order.create already validates the orderItems.length > 0
    let orderItems: OrderItemDTO[] = [];

    const variations = await Promise.all(
      variationIds.map((id) => this.productQueries.findVariation(id)),
    );

    orderItems = order.getOrderItems().map((oi, i) => {
      const v = variations[i];

      // this should be impossible since I don't allow variation deletion if it was linked to at least one order item
      if (!v) throw new NotFoundError("variation", oi.variationId.value);

      const orderItemSnapshot = oi.toSnapshot();

      return {
        id: orderItemSnapshot.id,
        variation: v,
        qty: orderItemSnapshot.qty,
        unitPriceAtOrderTime: oi.unitPriceAtOrderTime.toSnapshot(),
        unitDiscountPriceAtOrderTime:
          orderItemSnapshot.unitDiscountPriceAtOrderTime,
        weightAtOrderTime: orderItemSnapshot.weightAtOrderTime,
        lineTotal: orderItemSnapshot.lineTotal,
        discountAmount: orderItemSnapshot.discountAmount,
        totalWeightInGrams: orderItemSnapshot.totalWeightInGrams,
        hasDiscount: orderItemSnapshot.hasDiscount,
      };
    });

    const result = order.toSnapshot();

    return {
      id: result.id,
      userId: result.userId,
      trackingNumber: result.trackingNumber,
      status: result.status,
      shippingStatus: result.shippingStatus,
      shippingPriceAtOrderTime: result.shippingPriceAtOrderTime,
      selectedShippingProvider: result.selectedShippingProvider,
      shippingDetails: result.shippingDetails,
      orderItems,
      totalOrderPrice: result.totalOrderPrice,
      totalItemsPrice: result.totalItemsPrice,
      totalDiscount: result.totalDiscount,
      totalWeightInGrams: result.totalWeightInGrams,
      totalWeightInKg: result.totalWeightInKg,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }
}
