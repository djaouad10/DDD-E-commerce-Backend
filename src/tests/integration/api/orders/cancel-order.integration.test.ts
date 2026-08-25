import type { Container } from "#/composition/container.js";
import {
  clearDatabase,
  createCategoryInDB,
  createProductInDB,
  createUserInDB,
  saveCartInDB,
  saveOrderInDB,
  setupOrderInDB,
} from "#/tests/helpers/db-helpers.js";
import {
  orderFactory,
  productFactory,
} from "#/tests/helpers/domain-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { User } from "#/domain/entities/user.js";
import { Category } from "#/domain/entities/category.js";
import { Cart } from "#/domain/entities/cart.js";
import { CartItem } from "#/domain/entities/cart-item.js";
import {
  ORDER_REPOSITORY,
  OUTBOX_REPOSITORY,
  PRODUCT_REPOSITORY,
} from "#/composition/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { OrderStatus, ShippingProvider } from "#/domain/entities/order.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { OrderItem } from "#/domain/entities/order-item.js";
import { Money } from "#/domain/value-objects/money.js";
import { Weight } from "#/domain/value-objects/weight.js";
import { OutboxAction } from "#/application/repositories/outbox.repository.js";

describe("PATCH /api/v1/orders/:id/cancel", () => {
  let app: Express;
  let container: Container;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    const testApp = createTestApp();
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

  describe("Response Validation - HTTP Layer & Validation Errors", () => {
    test("when client cancels their own pending order, it should return 200 with success true", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createUserInDB(container, user);
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variation = product.getVariations()[0]!;
      const cart = Cart.create(user.id, [CartItem.create(variation.id, 2)]);
      await saveCartInDB(container, cart);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when admin cancels a client's order, it should return 200 with success true", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createUserInDB(container, user);
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variation = product.getVariations()[0]!;
      const cart = Cart.create(user.id, [CartItem.create(variation.id, 2)]);
      await saveCartInDB(container, cart);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when order does not exist, it should return 404", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${OrderId.generate().value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when client tries to cancel another client's order, it should return 403", async () => {
      // Arrange
      const owner = User.create(
        "Owner",
        "owner@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const intruder = User.create(
        "Intruder",
        "intruder@example.com",
        "CLIENT",
        null,
        true,
        false,
      );

      await createUserInDB(container, owner);
      await createUserInDB(container, intruder);

      const order = await setupOrderInDB(container, {
        owner: owner,
      });

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${intruder.id.value}`);

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange

      const owner = User.create(
        "Owner",
        "owner@example.com",
        "CLIENT",
        null,
        true,
        false,
      );

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
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      // Act
      const response = await request
        .patch("/api/v1/orders/invalid-id/cancel")
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Business Logic Validation - Domain Errors", () => {
    test("when order is already CANCELLED, it should return 200 (idempotent)", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });
      order.cancel();
      await saveOrderInDB(container, order);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when order is CONFIRMED, it should be cancellable", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });
      order.confirm();
      await saveOrderInDB(container, order);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when order is PRE_TRANSIT, it should NOT be cancellable (returns 400)", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });
      order.confirm();
      order.markAsPreTransit();
      await saveOrderInDB(container, order);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when order is SHIPPING, it should NOT be cancellable (returns 400)", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });
      order.confirm();
      order.markAsPreTransit();
      order.markAsShipping();
      await saveOrderInDB(container, order);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when order is DELIVERED, it should NOT be cancellable (returns 400)", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });
      order.confirm();
      order.markAsPreTransit();
      order.markAsShipping();
      order.markAsDelivered();
      await saveOrderInDB(container, order);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when order is RETURNED, it should NOT be cancellable (returns 400)", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });
      order.confirm();
      order.markAsPreTransit();
      order.markAsShipping();
      order.markAsReturned();
      await saveOrderInDB(container, order);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when order is SUSPENDED, it should NOT be cancellable (returns 400)", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });
      order.confirm();
      order.markAsPreTransit();
      order.markAsShipping();
      order.markAsSuspended();
      await saveOrderInDB(container, order);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("New State Validation - DB Changes", () => {
    test("when cancelling a pending order, it should update order status to CANCELLED", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const updatedOrder = await orderRepository.find(order.id);

      expect(updatedOrder).not.toBeNull();
      expect(updatedOrder!.getStatus()).toBe(OrderStatus.CANCELLED);
    });

    test("when cancelling an order, it should release the reserved stock", async () => {
      // I need to make a function that not only creates the order but also reserves the stock from original product, it's like calling the create order service
      // or I should simulae this behavior by manually reserving the stock of the order item variation

      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createUserInDB(container, user);
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const orderItem = OrderItem.create(
        variation.id,
        2, // we will manually reserve 2 units of this variation
        Money.of(3000, "DZD"),
        Weight.of(100, "g"),
        null,
      );

      const order = orderFactory({
        orderItems: [orderItem],
        userId: user.id,
      });

      await saveOrderInDB(container, order);

      // Reserve stock manually (simulating order creation)
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      // I need to refetch the product from DB because intial product was version 0 and isNew flag was true, so it will always be created fresh in DB, but if I refetch it, I will get version 1 and isNew flag will be false so product will be upserted not created
      const sameProduct = await productRepository.find(product.id);
      sameProduct!.reserveStock(variation.id, 2);

      await createProductInDB(container, sameProduct!);

      const initialReservedQty = sameProduct!
        .getVariation(variation.id)!
        .getReservedQty();

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert - Stock should be released
      const updatedProduct = await productRepository.find(product.id);
      const updatedVariation = updatedProduct!.getVariation(variation.id)!;

      expect(updatedVariation.getReservedQty()).toBe(initialReservedQty - 2);
    });

    test("when cancelling an order, it should release stock for all items", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation1 = product.getVariations()[0]!;
      const variation2 = product.getVariations()[1]!;

      await createUserInDB(container, user);
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const orderItem1 = OrderItem.create(
        variation1.id,
        2,
        Money.of(3000, "DZD"),
        Weight.of(100, "g"),
        null,
      );
      const orderItem2 = OrderItem.create(
        variation2.id,
        3,
        Money.of(2000, "DZD"),
        Weight.of(100, "g"),
        null,
      );

      const order = orderFactory({
        orderItems: [orderItem1, orderItem2],
        userId: user.id,
      });

      await saveOrderInDB(container, order);

      // Reserve stock manually
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      // I need to refetch the product from DB because intial product was version 0 and isNew flag was true, so it will always be created fresh in DB, but if I refetch it, I will get version 1 and isNew flag will be false so product will be upserted not created
      const sameProduct = await productRepository.find(product.id);
      sameProduct!.reserveStock(variation1.id, 2);
      sameProduct!.reserveStock(variation2.id, 3);
      await createProductInDB(container, sameProduct!);

      const initialReservedQty1 = sameProduct!
        .getVariation(variation1.id)!
        .getReservedQty();
      const initialReservedQty2 = sameProduct!
        .getVariation(variation2.id)!
        .getReservedQty();

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const updatedProduct = await productRepository.find(product.id);
      const updatedVariation1 = updatedProduct!.getVariation(variation1.id)!;
      const updatedVariation2 = updatedProduct!.getVariation(variation2.id)!;

      expect(updatedVariation1.getReservedQty()).toBe(initialReservedQty1 - 2);
      expect(updatedVariation2.getReservedQty()).toBe(initialReservedQty2 - 3);
    });

    test("when cancelling an order with tracking number, it should schedule a DELETE_ORDER_IN_SHIPPING_API job", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });
      order.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, order);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const jobs = await outboxRepository.getPendingJobs(100);

      const deleteJob = jobs.find(
        (j) => j.eventType === "delete_order_in_shipping_api",
      );
      expect(deleteJob).toBeDefined();
      expect(deleteJob!.payload).toMatchObject({
        trackingNumber: "TRACK123456",
        shippingProvider: ShippingProvider.WORLD_EXPRESS,
      });
    });

    test("when cancelling an order without tracking number, it should NOT schedule a DELETE_ORDER_IN_SHIPPING_API job", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });
      // No tracking number set

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const jobs = await outboxRepository.getPendingJobs(100);

      const deleteJob = jobs.find(
        (j) => j.eventType === "delete_order_in_shipping_api",
      );
      expect(deleteJob).toBeUndefined();
    });
  });

  describe("Event Persistence - Outbox", () => {
    test("when cancelling a pending order, it should persist OrderCancelled event to outbox", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const orderCancelledEvent = events.find(
        (e) => e.eventType === DomainEventCode.ORDER_CANCELLED,
      );
      expect(orderCancelledEvent).toBeDefined();
      expect(orderCancelledEvent!.aggregateId).toBe(order.id.value);
    });

    test("when cancelling an order, it should persist StockReleased events to outbox", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createUserInDB(container, user);
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const orderItem = OrderItem.create(
        variation.id,
        2,
        Money.of(3000, "DZD"),
        Weight.of(100, "g"),
        null,
      );

      const order = orderFactory({
        orderItems: [orderItem],
        userId: user.id,
      });

      await saveOrderInDB(container, order);

      // Reserve stock manually
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      // I need to refetch the product from DB because intial product was version 0 and isNew flag was true, so it will always be created fresh in DB, but if I refetch it, I will get version 1 and isNew flag will be false so product will be upserted not created
      const sameProduct = await productRepository.find(product.id);
      sameProduct!.reserveStock(variation.id, 2);
      await createProductInDB(container, sameProduct!);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const stockReleasedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.STOCK_RELEASED,
      );
      expect(stockReleasedEvents).toHaveLength(1);
      expect((stockReleasedEvents[0]!.payload as any).variationId).toBe(
        variation.id.value,
      );
      expect((stockReleasedEvents[0]!.payload as any).qty).toBe(2);
    });

    test("when cancelling an order with multiple items, it should persist multiple StockReleased events", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation1 = product.getVariations()[0]!;
      const variation2 = product.getVariations()[1]!;

      await createUserInDB(container, user);
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const orderItem1 = OrderItem.create(
        variation1.id,
        2,
        Money.of(3000, "DZD"),
        Weight.of(100, "g"),
        null,
      );
      const orderItem2 = OrderItem.create(
        variation2.id,
        3,
        Money.of(2000, "DZD"),
        Weight.of(100, "g"),
        null,
      );

      const order = orderFactory({
        orderItems: [orderItem1, orderItem2],
        userId: user.id,
      });

      await saveOrderInDB(container, order);

      // Reserve stock manually
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      // I need to refetch the product from DB because intial product was version 0 and isNew flag was true, so it will always be created fresh in DB, but if I refetch it, I will get version 1 and isNew flag will be false so product will be upserted not created
      const sameProduct = await productRepository.find(product.id);
      sameProduct!.reserveStock(variation1.id, 2);
      sameProduct!.reserveStock(variation2.id, 3);
      await createProductInDB(container, sameProduct!);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const stockReleasedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.STOCK_RELEASED,
      );
      expect(stockReleasedEvents).toHaveLength(2);

      const variationIds = stockReleasedEvents.map(
        (e) => (e.payload as any).variationId,
      );
      expect(variationIds).toContain(variation1.id.value);
      expect(variationIds).toContain(variation2.id.value);
    });

    test("when order is already cancelled, no new events should be persisted", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation1 = product.getVariations()[0]!;
      const variation2 = product.getVariations()[1]!;

      await createUserInDB(container, user);
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const orderItem1 = OrderItem.create(
        variation1.id,
        2,
        Money.of(3000, "DZD"),
        Weight.of(100, "g"),
        null,
      );
      const orderItem2 = OrderItem.create(
        variation2.id,
        3,
        Money.of(2000, "DZD"),
        Weight.of(100, "g"),
        null,
      );

      const order = orderFactory({
        orderItems: [orderItem1, orderItem2],
        userId: user.id,
      });

      order.cancel();
      await saveOrderInDB(container, order);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);
      const orderCancelledEvents = events.filter(
        (e) => e.eventType === DomainEventCode.ORDER_CANCELLED,
      );
      expect(orderCancelledEvents).toHaveLength(0);
    });

    test("when cancelling an order, all events should be persisted in the same transaction", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createUserInDB(container, user);
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const orderItem = OrderItem.create(
        variation.id,
        2,
        Money.of(3000, "DZD"),
        Weight.of(100, "g"),
        null,
      );

      const order = orderFactory({
        orderItems: [orderItem],
        userId: user.id,
      });

      await saveOrderInDB(container, order);

      // Reserve stock manually
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      // I need to refetch the product from DB because intial product was version 0 and isNew flag was true, so it will always be created fresh in DB, but if I refetch it, I will get version 1 and isNew flag will be false so product will be upserted not created
      const sameProduct = await productRepository.find(product.id);
      sameProduct!.reserveStock(variation.id, 2);
      await createProductInDB(container, sameProduct!);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const eventTypes = events.map((e) => e.eventType);
      expect(eventTypes).toContain(DomainEventCode.ORDER_CANCELLED);
      expect(eventTypes).toContain(DomainEventCode.STOCK_RELEASED);
    });
  });

  describe("Edge Cases", () => {
    test("when cancelling an order that has a tracking number, it should schedule a DELETE_ORDER_IN_SHIPPING_API job AND persist events", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createUserInDB(container, user);
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const orderItem = OrderItem.create(
        variation.id,
        2,
        Money.of(3000, "DZD"),
        Weight.of(100, "g"),
        null,
      );

      const order = orderFactory({
        orderItems: [orderItem],
        userId: user.id,
      });
      order.setTrackingNumber("TRACK789012");
      await saveOrderInDB(container, order);

      // Reserve stock manually
      // Reserve stock manually
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      // I need to refetch the product from DB because intial product was version 0 and isNew flag was true, so it will always be created fresh in DB, but if I refetch it, I will get version 1 and isNew flag will be false so product will be upserted not created
      const sameProduct = await productRepository.find(product.id);
      sameProduct!.reserveStock(variation.id, 2);
      await createProductInDB(container, sameProduct!);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert - Events
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const orderCancelledEvent = events.find(
        (e) => e.eventType === DomainEventCode.ORDER_CANCELLED,
      );
      expect(orderCancelledEvent).toBeDefined();

      const stockReleasedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.STOCK_RELEASED,
      );
      expect(stockReleasedEvents).toHaveLength(1);

      // Assert - Jobs
      const jobs = await outboxRepository.getPendingJobs(100);
      const deleteJob = jobs.find(
        (j) => j.eventType === OutboxAction.DELETE_ORDER_IN_SHIPPING_API,
      );
      expect(deleteJob).toBeDefined();
      expect(deleteJob!.payload).toMatchObject({
        trackingNumber: "TRACK789012",
        shippingProvider: order.getSelectedShippingProvider(),
      });
    });

    test("when admin cancels an order, it should not check userId ownership", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // Act - Admin cancels without userId parameter
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/cancel`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });

      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const updatedOrder = await orderRepository.find(order.id);
      expect(updatedOrder!.getStatus()).toBe(OrderStatus.CANCELLED);
    });
  });
});
