import type { Container } from "#/composition/utils/container.js";
import {
  clearDatabase,
  createCategoryInDB,
  createProductInDB,
  createUserInDB,
  saveOrderInDB,
  setupOrderInDB,
} from "#/tests/helpers/db-helpers.js";
import {
  orderFactory,
  productFactory,
  userFactory,
} from "#/tests/helpers/domain-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { Category } from "#/domain/entities/category.js";
import {
  ORDER_REPOSITORY,
  PRODUCT_REPOSITORY,
} from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { OrderStatus, ShippingProvider } from "#/domain/entities/order.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { OrderItem } from "#/domain/entities/order-item.js";
import { Money } from "#/domain/value-objects/money.js";
import { Weight } from "#/domain/value-objects/weight.js";
import { OutboxAction } from "#/application/ports/persistence/outbox.repository.port.js";
import { adminAuth, clientAuth } from "#/tests/helpers/auth-helpers.js";
import { Variation } from "#/domain/entities/variation.js";
import { Color, Size } from "#/domain/entities/product.js";
import { progressOrderTo } from "#/tests/helpers/order-lifecycle.js";
import {
  expectNoOutboxEvent,
  expectNoOutboxJob,
  expectOutboxEvent,
  expectOutboxEventCount,
  expectOutboxJob,
} from "#/tests/helpers/outbox-assertions.js";

describe("PATCH /api/v1/orders/:id/cancel", () => {
  let app: Express;
  let container: Container;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    const testApp = await createTestApp();
    container = testApp.container;
    app = testApp.app;
    request = supertest(app);
  });

  afterAll(async () => {
    cleanupTestApp();
  });

  beforeEach(async () => {
    nock.cleanAll();
    await clearDatabase(container);
  });

  async function setupOrderWithReservedStock(qty: number, qty2?: number) {
    const user = userFactory();
    const category = Category.create("Category");
    const product = productFactory({
      categoryId: category.id,
      customVariations: [
        Variation.create(Size.M, Color.RED, 100, 50, Weight.of(100, "g")),
        Variation.create(Size.L, Color.BLUE, 100, 50, Weight.of(100, "g")),
      ],
    });
    const [v1, v2] = product.getVariations();

    await createUserInDB(container, user);
    await createCategoryInDB(container, category);
    await createProductInDB(container, product);

    const items = [
      OrderItem.create(
        v1!.id,
        qty,
        Money.of(3000, "DZD"),
        Weight.of(100, "g"),
        null,
      ),
      ...(qty2
        ? [
            OrderItem.create(
              v2!.id,
              qty2,
              Money.of(2000, "DZD"),
              Weight.of(100, "g"),
              null,
            ),
          ]
        : []),
    ];
    const order = orderFactory({ orderItems: items, userId: user.id });
    await saveOrderInDB(container, order);

    const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
    const sameProduct = await productRepository.find(product.id);
    sameProduct!.reserveStock(v1!.id, qty);
    if (qty2) sameProduct!.reserveStock(v2!.id, qty2);
    await createProductInDB(container, sameProduct!);

    const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
    // we must fetch the freshest version of the order & product, so any future DB save will work isntead of throwing an error because of stale version
    const latestOrder = await orderRepository.find(order.id);
    const latestProduct = await productRepository.find(product.id);

    return {
      user,
      order: latestOrder!,
      product: latestProduct!,
      variation1: v1!,
      variation2: v2,
      productRepository,
    };
  }

  describe("Response Validation - HTTP Layer & Validation Errors", () => {
    test("when client cancels their own pending order, it should return 200 with success true", async () => {
      // Arrange
      const user = userFactory();

      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when admin cancels a client's order, it should return 200 with success true", async () => {
      // Arrange
      const user = userFactory();

      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when order does not exist, it should return 404", async () => {
      // Arrange
      const user = userFactory();

      await createUserInDB(container, user);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${OrderId.generate().value}/cancel`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when client tries to cancel another client's order, it should return 403", async () => {
      // Arrange
      const owner = userFactory();
      const intruder = userFactory();

      await createUserInDB(container, owner);
      await createUserInDB(container, intruder);

      const order = await setupOrderInDB(container, {
        owner: owner,
      });

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", clientAuth(intruder.id.value));

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange

      const owner = userFactory();

      await createUserInDB(container, owner);

      const order = await setupOrderInDB(container, {
        owner,
      });

      // Act
      const response = await request.patch(
        `/api/v1/orders/${order.id.value}/cancel`,
      );

      // Assert
      expect(response.status).toBe(401);
    });

    test("when order id format is invalid, it should return 400", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      // Act
      const response = await request
        .patch("/api/v1/orders/invalid-id/cancel")
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Business Logic Validation - Domain Errors", () => {
    test("when order is already CANCELLED, it should return 200 (idempotent)", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      await progressOrderTo(container, order.id, OrderStatus.CANCELLED);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when order is CONFIRMED, it should be cancellable", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      await progressOrderTo(container, order.id, OrderStatus.CONFIRMED);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test.each([
      OrderStatus.PRE_TRANSIT,
      OrderStatus.SHIPPING,
      OrderStatus.DELIVERED,
      OrderStatus.RETURNED,
      OrderStatus.SUSPENDED,
    ])(
      "when order is %s, it should NOT be cancellable (returns 400)",
      async (status) => {
        // Arrange
        const user = userFactory();
        await createUserInDB(container, user);
        const order = await setupOrderInDB(container, { owner: user });
        await progressOrderTo(container, order.id, status);

        // Act
        const response = await request
          .patch(`/api/v1/orders/${order.id.value}/cancel`)
          .set("authorization", clientAuth(user.id.value));

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
      },
    );
  });

  describe("New State Validation - DB Changes", () => {
    test("when cancelling a pending order, it should update order status to CANCELLED", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const updatedOrder = await orderRepository.find(order.id);

      expect(updatedOrder).not.toBeNull();
      expect(updatedOrder!.getStatus()).toBe(OrderStatus.CANCELLED);
    });

    test("when cancelling an order, it should release the reserved stock", async () => {
      // Arrange
      const { order, product, user, productRepository, variation1 } =
        await setupOrderWithReservedStock(2);

      const [productBeforeCancel] = await productRepository.findByVariationIds([
        variation1.id,
      ]);

      const initialReservedQty = productBeforeCancel!
        .getVariation(variation1.id)!
        .getReservedQty();

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", clientAuth(user.id.value));

      // Assert - Stock should be released
      const updatedProduct = await productRepository.find(product.id);
      const updatedVariation = updatedProduct!.getVariation(variation1.id)!;

      expect(updatedVariation.getReservedQty()).toBe(initialReservedQty - 2);
    });

    test("when cancelling an order, it should release stock for all items", async () => {
      // Arrange
      const {
        order,
        product,
        user,
        productRepository,
        variation1,
        variation2,
      } = await setupOrderWithReservedStock(2, 3);

      const [productBeforeCancel] = await productRepository.findByVariationIds([
        variation1.id,
      ]);

      const initialReservedQtyV1 = productBeforeCancel!
        .getVariation(variation1.id)!
        .getReservedQty();

      const initialReservedQty2 = productBeforeCancel!
        .getVariation(variation2!.id)! // variation2 exists because we passed the 2nd parameter to setupOrderWithReservedStock
        .getReservedQty();

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const updatedProduct = await productRepository.find(product.id);
      const updatedVariation1 = updatedProduct!.getVariation(variation1.id)!;
      const updatedVariation2 = updatedProduct!.getVariation(variation2!.id)!;

      expect(updatedVariation1.getReservedQty()).toBe(initialReservedQtyV1 - 2);
      expect(updatedVariation2.getReservedQty()).toBe(initialReservedQty2 - 3);
    });

    test("when cancelling an order with tracking number, it should schedule a DELETE_ORDER_IN_SHIPPING_API job", async () => {
      // Arrange
      const { order, user } = await setupOrderWithReservedStock(2);

      await progressOrderTo(container, order.id, OrderStatus.CONFIRMED, {
        trackingNumber: "TRACK123456",
      });

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      await expectOutboxJob(
        container,
        OutboxAction.DELETE_ORDER_IN_SHIPPING_API,
        {
          trackingNumber: "TRACK123456",
          shippingProvider: ShippingProvider.WORLD_EXPRESS,
        },
      );
    });

    test("when cancelling an order without tracking number, it should NOT schedule a DELETE_ORDER_IN_SHIPPING_API job", async () => {
      // Arrange
      const { order, user } = await setupOrderWithReservedStock(2);

      await progressOrderTo(container, order.id, OrderStatus.CONFIRMED);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      await expectNoOutboxJob(
        container,
        OutboxAction.DELETE_ORDER_IN_SHIPPING_API,
      );
    });
  });

  describe("Event Persistence - Outbox", () => {
    test("when cancelling a pending order, it should persist OrderCancelled event to outbox", async () => {
      // Arrange
      const { order, user } = await setupOrderWithReservedStock(2);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      await expectOutboxEvent(
        container,
        DomainEventCode.ORDER_CANCELLED,
        order.id.value,
      );
    });

    test("when cancelling an order, it should persist StockReleased events to outbox", async () => {
      // Arrange
      const { order, user, variation1, product } =
        await setupOrderWithReservedStock(2);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", clientAuth(user.id.value));

      // Assert

      const event = await expectOutboxEvent(
        container,
        DomainEventCode.STOCK_RELEASED,
        product.id.value,
      );

      await expectOutboxEventCount(
        container,
        DomainEventCode.STOCK_RELEASED,
        1,
      );

      expect((event.payload as any).variationId).toBe(variation1.id.value);
      expect((event!.payload as any).qty).toBe(2);
    });

    test("when cancelling an order with multiple items, it should persist multiple StockReleased events", async () => {
      // Arrange
      const { order, user } = await setupOrderWithReservedStock(2, 3);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.STOCK_RELEASED,
        2,
      );
    });

    test("when order is already cancelled, no new events should be persisted", async () => {
      // Arrange
      const { order, user } = await setupOrderWithReservedStock(2);
      await progressOrderTo(container, order.id, OrderStatus.CANCELLED);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      await expectNoOutboxEvent(container, DomainEventCode.STOCK_RELEASED);
    });

    test("when cancelling an order, all events should be persisted in the same transaction", async () => {
      // Arrange
      const { order, user } = await setupOrderWithReservedStock(2);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.STOCK_RELEASED,
        1,
      );
      await expectOutboxEventCount(
        container,
        DomainEventCode.ORDER_CANCELLED,
        1,
      );
    });
  });

  describe("Edge Cases", () => {
    test("when cancelling an order that has a tracking number, it should schedule a DELETE_ORDER_IN_SHIPPING_API job AND persist events", async () => {
      // Arrange
      const { order, user, product } = await setupOrderWithReservedStock(2);
      await progressOrderTo(container, order.id, OrderStatus.CONFIRMED, {
        trackingNumber: "TRACK789012",
      });

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", clientAuth(user.id.value));

      // Assert - Events
      await expectOutboxEvent(
        container,
        DomainEventCode.STOCK_RELEASED,
        product.id.value,
      );

      await expectOutboxEvent(
        container,
        DomainEventCode.ORDER_CANCELLED,
        order.id.value,
      );

      await expectOutboxJob(
        container,
        OutboxAction.DELETE_ORDER_IN_SHIPPING_API,
        {
          trackingNumber: "TRACK789012",
          shippingProvider: ShippingProvider.WORLD_EXPRESS,
        },
      );
    });

    test("when admin cancels an order, it should not check userId ownership", async () => {
      // Arrange
      const { order } = await setupOrderWithReservedStock(2);

      // Act - Admin cancels without userId parameter
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });
  });
});
