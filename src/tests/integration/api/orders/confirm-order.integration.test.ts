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
import { OrderStatus } from "#/domain/entities/order.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { OutboxAction } from "#/application/repositories/outbox.repository.js";

describe("PATCH /api/v1/orders/:id/confirm", () => {
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
    test("when admin confirms a pending order, it should return 200 with success true", async () => {
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
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when order does not exist, it should return 404", async () => {
      // Act
      const response = await request
        .patch(`/api/v1/orders/${OrderId.generate().value}/confirm`)
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

      // Act
      const response = await request.patch(
        `/api/v1/orders/${order.id.value}/confirm`,
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

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(403);
    });

    test("when order id format is invalid, it should return 400", async () => {
      // Act
      const response = await request
        .patch("/api/v1/orders/invalid-id/confirm")
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Business Logic Validation - Domain Errors", () => {
    test("when order is already CONFIRMED, it should return 400 (invalid status transition)", async () => {
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.confirm();
      await saveOrderInDB(container, orderFromDB!);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.confirm();
      orderFromDB!.markAsPreTransit();
      await saveOrderInDB(container, orderFromDB!);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.confirm();
      orderFromDB!.markAsPreTransit();
      orderFromDB!.markAsShipping();
      await saveOrderInDB(container, orderFromDB!);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.confirm();
      orderFromDB!.markAsPreTransit();
      orderFromDB!.markAsShipping();
      orderFromDB!.markAsDelivered();
      await saveOrderInDB(container, orderFromDB!);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.confirm();
      orderFromDB!.markAsPreTransit();
      orderFromDB!.markAsShipping();
      orderFromDB!.markAsReturned();
      await saveOrderInDB(container, orderFromDB!);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.cancel();
      await saveOrderInDB(container, orderFromDB!);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.confirm();
      orderFromDB!.markAsPreTransit();
      orderFromDB!.markAsShipping();
      orderFromDB!.markAsSuspended();
      await saveOrderInDB(container, orderFromDB!);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("New State Validation - DB Changes", () => {
    test("when confirming a pending order, it should update order status to CONFIRMED", async () => {
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
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const updatedOrder = await orderRepository.find(order.id);

      expect(updatedOrder).not.toBeNull();
      expect(updatedOrder!.getStatus()).toBe(OrderStatus.CONFIRMED);
    });

    test("when confirming an order without tracking number, it should schedule a CREATE_ORDER_IN_SHIPPING_API job", async () => {
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.removeTrackingNumber();
      await saveOrderInDB(container, orderFromDB!);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const jobs = await outboxRepository.getPendingJobs(100);

      const createJob = jobs.find(
        (j) => j.eventType === OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
      );
      expect(createJob).toBeDefined();
      expect(createJob!.payload).toMatchObject({
        orderId: order.id.value,
      });
    });
  });

  describe("Event Persistence - Outbox", () => {
    test("when confirming a pending order, it should persist OrderConfirmed event to outbox", async () => {
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
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const orderConfirmedEvent = events.find(
        (e) => e.eventType === DomainEventCode.ORDER_CONFIRMED,
      );
      expect(orderConfirmedEvent).toBeDefined();
      expect(orderConfirmedEvent!.aggregateId).toBe(order.id.value);
    });

    test("when confirming an order, exactly one OrderConfirmed event should be persisted", async () => {
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
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const orderConfirmedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.ORDER_CONFIRMED,
      );
      expect(orderConfirmedEvents).toHaveLength(1);
    });

    test("when confirming an order without tracking number, it should persist OrderConfirmed event AND schedule a CREATE_ORDER_IN_SHIPPING_API job", async () => {
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.removeTrackingNumber();
      await saveOrderInDB(container, orderFromDB!);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);

      // Check events
      const events = await outboxRepository.getPendingEvents(100);
      const orderConfirmedEvent = events.find(
        (e) => e.eventType === DomainEventCode.ORDER_CONFIRMED,
      );
      expect(orderConfirmedEvent).toBeDefined();
      expect(orderConfirmedEvent!.aggregateId).toBe(order.id.value);

      // Check jobs
      const jobs = await outboxRepository.getPendingJobs(100);
      const createJob = jobs.find(
        (j) => j.eventType === OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
      );
      expect(createJob).toBeDefined();
      expect(createJob!.payload).toMatchObject({
        orderId: order.id.value,
      });
    });

    test("when confirming an order, the event and job should be persisted in the same transaction", async () => {
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.setTrackingNumber("TRACK999999");
      await saveOrderInDB(container, orderFromDB!);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);

      const events = await outboxRepository.getPendingEvents(100);
      const orderConfirmedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.ORDER_CONFIRMED,
      );
      expect(orderConfirmedEvents).toHaveLength(1);

      const jobs = await outboxRepository.getPendingJobs(100);
      const createJobs = jobs.filter(
        (j) => j.eventType === OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
      );
      expect(createJobs).toHaveLength(1);
    });
  });

  describe("Edge Cases", () => {
    test("when confirming an order that already has tracking number from previous operation, it should still schedule CREATE_ORDER_IN_SHIPPING_API job", async () => {
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.setTrackingNumber("TRACK555555");
      await saveOrderInDB(container, orderFromDB!);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);

      // Verify order status changed
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const updatedOrder = await orderRepository.find(order.id);
      expect(updatedOrder!.getStatus()).toBe(OrderStatus.CONFIRMED);

      // Verify job was scheduled
      const jobs = await outboxRepository.getPendingJobs(100);
      const createJob = jobs.find(
        (j) => j.eventType === OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
      );
      expect(createJob).toBeDefined();
      expect(createJob!.payload).toMatchObject({
        orderId: order.id.value,
      });
    });

    test("when multiple orders are confirmed, each should have its own OrderConfirmed event", async () => {
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
      const order2 = await setupOrderInDB(container, { owner: user });

      // Act
      await request
        .patch(`/api/v1/orders/${order1.id.value}/confirm`)
        .set("authorization", "Bearer test-admin-token");

      await request
        .patch(`/api/v1/orders/${order2.id.value}/confirm`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const orderConfirmedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.ORDER_CONFIRMED,
      );
      expect(orderConfirmedEvents).toHaveLength(2);

      const aggregateIds = orderConfirmedEvents.map((e) => e.aggregateId);
      expect(aggregateIds).toContain(order1.id.value);
      expect(aggregateIds).toContain(order2.id.value);
    });

    test("confirming an order should update the updatedAt timestamp", async () => {
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
      const beforeUpdate = order.getUpdatedAt();

      // Act - Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
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
