import type { Container } from "#/composition/container.js";
import {
  clearDatabase,
  createUserInDB,
  saveOrderInDB,
  setupOrderInDB,
} from "#/tests/helpers/db-helpers.js";

import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { User } from "#/domain/entities/user.js";

import { ORDER_REPOSITORY, OUTBOX_REPOSITORY } from "#/composition/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { OrderStatus, ShippingProvider } from "#/domain/entities/order.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { OutboxAction } from "#/application/repositories/outbox.repository.js";

describe("PATCH /api/v1/orders/:id/ship", () => {
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
    test("when admin ships a confirmed order with tracking number, it should return 200 with success true", async () => {
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
      order.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, order);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when order does not exist, it should return 404", async () => {
      // Act
      const response = await request
        .patch(`/api/v1/orders/${OrderId.generate().value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when no auth token is provided, it should return 401", async () => {
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
      order.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, order);

      // Act
      const response = await request.patch(
        `/api/v1/orders/${order.id.value}/ship`,
      );

      // Assert
      expect(response.status).toBe(401);
    });

    test("when client token is used (non-admin), it should return 403", async () => {
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
      order.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, order);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(403);
    });

    test("when order id format is invalid, it should return 400", async () => {
      // Act
      const response = await request
        .patch("/api/v1/orders/invalid-id/ship")
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Business Logic Validation - Domain Errors", () => {
    test("when order is PENDING, it should return 400 (invalid status transition)", async () => {
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
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when order has no tracking number, it should return 404", async () => {
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
      // No tracking number set
      await saveOrderInDB(container, order);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when order is PRE_TRANSIT, it should return 400 (invalid status transition)", async () => {
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
      order.setTrackingNumber("TRACK123456");
      order.markAsPreTransit();
      await saveOrderInDB(container, order);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when order is SHIPPING, it should return 400 (invalid status transition)", async () => {
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
      order.setTrackingNumber("TRACK123456");
      order.markAsPreTransit();
      order.markAsShipping();
      await saveOrderInDB(container, order);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when order is DELIVERED, it should return 400 (invalid status transition)", async () => {
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
      order.setTrackingNumber("TRACK123456");
      order.markAsPreTransit();
      order.markAsShipping();
      order.markAsDelivered();
      await saveOrderInDB(container, order);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when order is RETURNED, it should return 400 (invalid status transition)", async () => {
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
      order.setTrackingNumber("TRACK123456");
      order.markAsPreTransit();
      order.markAsShipping();
      order.markAsReturned();
      await saveOrderInDB(container, order);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when order is CANCELLED, it should return 400 (invalid status transition)", async () => {
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
      order.cancel();
      await saveOrderInDB(container, order);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when order is SUSPENDED, it should return 400 (invalid status transition)", async () => {
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
      order.setTrackingNumber("TRACK123456");
      order.markAsPreTransit();
      order.markAsShipping();
      order.markAsSuspended();
      await saveOrderInDB(container, order);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("New State Validation - DB Changes", () => {
    test("when shipping a confirmed order, it should update order status to PRE_TRANSIT", async () => {
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
      order.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, order);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const updatedOrder = await orderRepository.find(order.id);

      expect(updatedOrder).not.toBeNull();
      expect(updatedOrder!.getStatus()).toBe(OrderStatus.PRE_TRANSIT);
    });

    test("when shipping an order, it should schedule a CREATE_SHIPMENT_IN_SHIPPING_API job", async () => {
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
      const trackingNumber = "TRACK123456";
      order.setTrackingNumber(trackingNumber);
      await saveOrderInDB(container, order);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const jobs = await outboxRepository.getPendingJobs(100);

      const createShipmentJob = jobs.find(
        (j) => j.eventType === OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API,
      );
      expect(createShipmentJob).toBeDefined();
      expect(createShipmentJob!.payload).toMatchObject({
        trackingNumber: trackingNumber,
      });
    });
  });

  describe("Event Persistence - Outbox", () => {
    test("when shipping a confirmed order, it should persist OrderMarkedAsPreTransit event to outbox", async () => {
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
      const trackingNumber = "TRACK123456";
      order.setTrackingNumber(trackingNumber);
      await saveOrderInDB(container, order);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const orderMarkedAsPreTransitEvent = events.find(
        (e) => e.eventType === DomainEventCode.ORDER_MARKED_AS_PRE_TRANSIT,
      );
      expect(orderMarkedAsPreTransitEvent).toBeDefined();
      expect(orderMarkedAsPreTransitEvent!.aggregateId).toBe(order.id.value);

      const payload = orderMarkedAsPreTransitEvent!.payload as any;
      expect(payload.trackingNumber).toBe(trackingNumber);
      expect(payload.selectedShippingProvider).toBe(
        ShippingProvider.WORLD_EXPRESS,
      );
    });

    test("when shipping an order, exactly one OrderMarkedAsPreTransit event should be persisted", async () => {
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
      order.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, order);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const orderMarkedAsPreTransitEvents = events.filter(
        (e) => e.eventType === DomainEventCode.ORDER_MARKED_AS_PRE_TRANSIT,
      );
      expect(orderMarkedAsPreTransitEvents).toHaveLength(1);
    });

    test("when shipping an order, it should persist OrderMarkedAsPreTransit event AND schedule a CREATE_SHIPMENT_IN_SHIPPING_API job", async () => {
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
      const trackingNumber = "TRACK789012";
      order.setTrackingNumber(trackingNumber);
      await saveOrderInDB(container, order);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);

      // Check events
      const events = await outboxRepository.getPendingEvents(100);
      const orderMarkedAsPreTransitEvent = events.find(
        (e) => e.eventType === DomainEventCode.ORDER_MARKED_AS_PRE_TRANSIT,
      );
      expect(orderMarkedAsPreTransitEvent).toBeDefined();
      expect(orderMarkedAsPreTransitEvent!.aggregateId).toBe(order.id.value);

      // Check jobs
      const jobs = await outboxRepository.getPendingJobs(100);
      const createShipmentJob = jobs.find(
        (j) => j.eventType === OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API,
      );
      expect(createShipmentJob).toBeDefined();
      expect(createShipmentJob!.payload).toMatchObject({
        trackingNumber: trackingNumber,
      });
    });

    test("when shipping an order, the event and job should be persisted in the same transaction", async () => {
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
      order.setTrackingNumber("TRACK999999");
      await saveOrderInDB(container, order);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);

      const events = await outboxRepository.getPendingEvents(100);
      const orderMarkedAsPreTransitEvents = events.filter(
        (e) => e.eventType === DomainEventCode.ORDER_MARKED_AS_PRE_TRANSIT,
      );
      expect(orderMarkedAsPreTransitEvents).toHaveLength(1);

      const jobs = await outboxRepository.getPendingJobs(100);
      const createShipmentJobs = jobs.filter(
        (j) => j.eventType === OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API,
      );
      expect(createShipmentJobs).toHaveLength(1);
    });
  });

  describe("Edge Cases", () => {
    test("when shipping an order that was confirmed but has tracking number from create order, it should still schedule CREATE_SHIPMENT_IN_SHIPPING_API job", async () => {
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
      order.setTrackingNumber("TRACK555555");
      await saveOrderInDB(container, order);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);

      // Verify order status changed
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const updatedOrder = await orderRepository.find(order.id);
      expect(updatedOrder!.getStatus()).toBe(OrderStatus.PRE_TRANSIT);

      // Verify job was scheduled
      const jobs = await outboxRepository.getPendingJobs(100);
      const createShipmentJob = jobs.find(
        (j) => j.eventType === OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API,
      );
      expect(createShipmentJob).toBeDefined();
      expect(createShipmentJob!.payload).toMatchObject({
        trackingNumber: "TRACK555555",
      });
    });

    test("when multiple orders are shipped, each should have its own OrderMarkedAsPreTransit event", async () => {
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

      const order1 = await setupOrderInDB(container, { owner: user });
      order1.confirm();
      order1.setTrackingNumber("TRACK111111");
      await saveOrderInDB(container, order1);

      const order2 = await setupOrderInDB(container, { owner: user });
      order2.confirm();
      order2.setTrackingNumber("TRACK222222");
      await saveOrderInDB(container, order2);

      // Act
      await request
        .patch(`/api/v1/orders/${order1.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      await request
        .patch(`/api/v1/orders/${order2.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const orderMarkedAsPreTransitEvents = events.filter(
        (e) => e.eventType === DomainEventCode.ORDER_MARKED_AS_PRE_TRANSIT,
      );
      expect(orderMarkedAsPreTransitEvents).toHaveLength(2);

      const aggregateIds = orderMarkedAsPreTransitEvents.map(
        (e) => e.aggregateId,
      );
      expect(aggregateIds).toContain(order1.id.value);
      expect(aggregateIds).toContain(order2.id.value);
    });

    test("shipping an order should update the updatedAt timestamp", async () => {
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
      order.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, order);

      const beforeUpdate = order.getUpdatedAt();

      // Act - Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const updatedOrder = await orderRepository.find(order.id);

      expect(updatedOrder!.getUpdatedAt().getTime()).toBeGreaterThan(
        beforeUpdate.getTime(),
      );
    });
  });
});
