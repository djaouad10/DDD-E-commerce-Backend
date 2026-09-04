import { OrderItem } from "#/domain/entities/order-item.js";
import { Order } from "#/domain/entities/order.js";
import type { Product } from "#/domain/entities/product.js";
import type { ShippingProviderGateway } from "#/domain/gateways/shipping-provider.gateway.js";
import type { CartRepository } from "#/domain/repositories/cart.repository.js";
import type { OrderRepository } from "#/domain/repositories/order.repository.js";
import type { ProductRepository } from "#/domain/repositories/product.repository.js";
import type { UserRepository } from "#/domain/repositories/user.repository.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { ShippingDetails } from "#/domain/value-objects/shipping-details.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import type { DrizzleDBClient } from "#/infrastructure/config/database.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "#/shared/errors/domain-error.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { CreateOrderCommand } from "../../commands/api/create-order.command.js";
import type { IdempotencyKeysRepository } from "../../ports/persistence/idempotency-keys.repository.port.js";
import type { OutboxRepository } from "../../ports/persistence/outbox.repository.port.js";

export class CreateOrderService {
  private logger = createLogger("CreateOrderService");

  constructor(
    private db: DrizzleDBClient,
    private orderRepository: OrderRepository,
    private cartRepository: CartRepository,
    private userRepository: UserRepository,
    private shippingProviderGateway: ShippingProviderGateway,
    private productRepository: ProductRepository,
    private idempotencyKeysRepository: IdempotencyKeysRepository,
    private outboxRepository: OutboxRepository,
  ) {}

  async execute(command: CreateOrderCommand): Promise<OrderId> {
    this.logger.info(`CreateOrderService.execute called`, { command });

    const {
      userId,
      providedShippingPrice,
      selectedShippingProvider,
      shippingDetails,
      idempotencyKey,
    } = command;

    // check if idempotency key exists
    const existingOrderId = await this.db.transaction(async (tx) => {
      const existingKey = await this.idempotencyKeysRepository.find(
        idempotencyKey,
        tx,
      );

      if (!existingKey) {
        return null;
      }

      return this.parseOrderIdFromPayload(existingKey.payload);
    });

    if (existingOrderId) {
      return existingOrderId;
    }

    // check if the shipping price selected by client is actually the one listed by the provider (so clients aren't charged a different price than they agreed to on the frontend)
    const [providerDeliveryPriceOfWilaya, communesOfWilaya, user, cart] =
      await Promise.all([
        // u would typically use an abstraction on top of shipping provider gateways to route the request based on the provider, but since I only have one provider, I'll just use the gateway directly
        this.shippingProviderGateway.getDeliveryFeesOfWilaya(
          shippingDetails.wilayaCode,
        ),
        this.shippingProviderGateway.getActiveCommunesOfWilaya(
          shippingDetails.wilayaCode,
        ),
        this.userRepository.find(UserId.of(userId)),
        this.cartRepository.findByUserId(UserId.of(userId)),
      ]);

    let providerDeliveryPrice =
      shippingDetails.deliveryType === "TO_DESK"
        ? providerDeliveryPriceOfWilaya.stopDeskFee
        : providerDeliveryPriceOfWilaya.homeDeliveryFee;

    // you would also include a currency check but I only use DZD here so it's not necessary
    if (providedShippingPrice !== providerDeliveryPrice.amount) {
      throw new ValidationError(
        "shippingPrice",
        "provided shipping price doesn't match the one listed by the provider",
      );
    }

    // check if provided postal code exists on that wilaya for that shipping provider
    const commune = communesOfWilaya.find(
      (commune) => commune.postalCode === shippingDetails.postalCode,
    );

    if (!commune) {
      throw new ValidationError(
        "postalCode",
        "provided postal code doesn't exist on that wilaya for that shipping provider",
      );
    }

    // check if user exist
    if (!user) {
      throw new NotFoundError("user", `user doesn't exist with id ${userId}`);
    }

    // check if user is banned
    if (user.isBanned()) {
      throw new ForbiddenError("create order", userId);
    }

    if (cart.getItems().length === 0) {
      throw new ValidationError("cart", "cart is empty");
    }

    // check if each cart item has the required variation quantity
    const variationIds = cart.getItems().map((item) => item.variationId);

    const products =
      await this.productRepository.findByVariationIds(variationIds);

    const variationToProductMap = new Map<string, Product>();

    for (const product of products) {
      for (const variation of product.getVariations()) {
        variationToProductMap.set(variation.id.value, product);
      }
    }

    // for each cart item create an order item:
    const orderItems: OrderItem[] = cart.getItems().map((item) => {
      const targetProduct = variationToProductMap.get(item.variationId.value);

      if (!targetProduct) {
        throw new ValidationError(
          "product",
          "a product referenced by a cart item not found",
        );
      }

      const targetVariation = targetProduct.getVariation(item.variationId);

      if (!targetVariation) {
        throw new ValidationError(
          "variation",
          "a variation referenced by a cart item not found",
        );
      }

      // reserve stock
      targetProduct.reserveStock(targetVariation.id, item.getQty());

      // create the order item
      return OrderItem.create(
        item.variationId,
        item.getQty(),
        targetProduct.getPrice(),
        targetVariation.getWeight(),
        targetProduct.getDiscountedPrice(),
      );
    });

    const orderShippingDetails = ShippingDetails.create(
      shippingDetails.deliveryType,
      shippingDetails.fullName,
      shippingDetails.firstPhone,
      shippingDetails.wilayaCode,
      shippingDetails.commune,
      shippingDetails.postalCode,
      shippingDetails.address,
      shippingDetails.fragile,
      shippingDetails.secondPhone,
      shippingDetails.gpsLink,
      shippingDetails.clientNote,
    );

    const order = Order.create(
      UserId.of(userId),
      orderShippingDetails,
      orderItems,
      providerDeliveryPrice,
      selectedShippingProvider,
    );

    cart.clear();

    const orderEvents = order.pullEvents();
    const productEvents = products.flatMap((p) => p.pullEvents());
    const cartEvents = cart.pullEvents();

    this.logger.debug("Saving order", { id: order.id.value });
    await this.db.transaction(async (tx) => {
      await this.idempotencyKeysRepository.create(
        idempotencyKey,
        "CreateOrderService",
        tx,
        {
          orderId: order.id.value,
        },
      );

      await Promise.all([
        this.orderRepository.save(order, tx),
        this.cartRepository.save(cart, tx),
        this.outboxRepository.saveEvents(
          [...orderEvents, ...productEvents, ...cartEvents],
          tx,
        ),
      ]);

      await Promise.all(
        products.map((p) => this.productRepository.save(p, tx)),
      );
    });

    return order.id;
  }

  private parseOrderIdFromPayload(payload: unknown): OrderId | null {
    if (
      payload &&
      typeof payload === "object" &&
      "orderId" in payload &&
      typeof (payload as Record<string, unknown>).orderId === "string"
    ) {
      try {
        return OrderId.of(
          (payload as Record<string, unknown>).orderId as string,
        );
      } catch {
        return null;
      }
    }
    return null;
  }
}
