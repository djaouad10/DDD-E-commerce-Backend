import { OrderStatus } from "#/domain/entities/order.js";
import type { Product } from "#/domain/entities/product.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import type { OutboxJobPayloadType } from "#/infrastructure/messaging/jobs/validation.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { CancelOrderCommand } from "../commands/api/cancel-order.command.js";
import {
  OutboxAction,
  type OutboxRepository,
} from "../repositories/outbox.repository.js";

export class CancelOrderService {
  private logger = createLogger("CancelOrderService");

  constructor(
    private db: DrizzleDBClient,
    private orderRepository: OrderRepository,
    private productRepository: ProductRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: CancelOrderCommand): Promise<void> {
    this.logger.info("CancelOrderService.execute called", { command });

    const orderId = OrderId.of(command.orderId);
    const userId = command.userId ? UserId.of(command.userId) : null; // userId is only defined if the user making the request is a client, to prevent unauthorized access to other clients' orders

    const order = await this.orderRepository.find(orderId);

    if (!order) throw new NotFoundError("order", orderId.value);

    if (userId && !order.userId.equals(userId)) {
      throw new ForbiddenError("cancel order", userId.value);
    }

    if (order.getStatus() === OrderStatus.CANCELLED) return;

    order.cancel();

    const variationIds = order.getOrderItems().map((oi) => oi.getVariationId());

    // get all products related to the order
    const products =
      await this.productRepository.findByVariationIds(variationIds);

    const variationToProductMap = new Map<string, Product>();

    for (const product of products) {
      for (const variation of product.getVariations()) {
        variationToProductMap.set(variation.id.value, product);
      }
    }

    // release stock
    order.getOrderItems().forEach((item) => {
      const targetProduct = variationToProductMap.get(item.variationId.value);

      if (!targetProduct)
        throw new ValidationError(
          "product",
          "a product referenced by an order item not found",
        );

      targetProduct.releaseStock(item.variationId, item.getQty());
    });

    const orderEvents = order.pullEvents();
    const productEvents = products.flatMap((p) => p.pullEvents());

    const trackingNumber = order.getTrackingNumber();

    this.logger.debug("Saving order", { id: order.id.value });

    await this.db.transaction(async (tx) => {
      await Promise.all([
        this.orderRepository.save(order, tx),
        this.outboxRepository.saveEvents(
          [...orderEvents, ...productEvents],
          tx,
        ),
      ]);

      await Promise.all(
        products.map((p) => this.productRepository.save(p, tx)),
      );

      // if the order has a tracking number, it means this order was created in the shipping api, so we need to schedule a transactional outbox job to delete it, since we don't wanna make external(gateway) write requests inside of a transaction
      if (trackingNumber) {
        const payload: OutboxJobPayloadType<
          typeof OutboxAction.DELETE_ORDER_IN_SHIPPING_API
        > = {
          shippingProvider: order.getSelectedShippingProvider(),
          trackingNumber,
        };

        await this.outboxRepository.saveJob(
          {
            action: OutboxAction.DELETE_ORDER_IN_SHIPPING_API,
            payload: payload,
          },
          tx,
        );
      }
    });
  }
}
