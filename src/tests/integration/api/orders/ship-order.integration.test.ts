import type { Container } from "#/composition/utils/container.js";
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

import { ORDER_REPOSITORY } from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { OrderStatus } from "#/domain/entities/order.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { OutboxAction } from "#/application/ports/persistence/outbox.repository.port.js";
import { adminAuth, clientAuth } from "#/tests/helpers/auth-helpers.js";
import { userFactory } from "#/tests/helpers/domain-helpers.js";
import { progressOrderTo } from "#/tests/helpers/order-helpers.js";
import {
  expectOutboxEvent,
  expectOutboxEventCount,
  expectOutboxJob,
} from "#/tests/helpers/outbox-assertions.js";

describe("PATCH /api/v1/orders/:id/ship", () => {
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

  describe("Response Validation - HTTP Layer & Validation Errors", () => {
    test("when admin ships a confirmed order with tracking number, it should return 200 with success true", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      order.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, order);

      await progressOrderTo(container, order.id, OrderStatus.CONFIRMED);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when order does not exist, it should return 404", async () => {
      // Act
      const response = await request
        .patch(`/api/v1/orders/${OrderId.generate().value}/ship`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      order.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, order);

      await progressOrderTo(container, order.id, OrderStatus.CONFIRMED);

      // Act
      const response = await request.patch(
        `/api/v1/orders/${order.id.value}/ship`,
      );

      // Assert
      expect(response.status).toBe(401);
    });

    test("when client token is used (non-admin), it should return 403", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      order.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, order);

      await progressOrderTo(container, order.id, OrderStatus.CONFIRMED);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", clientAuth());

      // Assert
      expect(response.status).toBe(403);
    });

    test("when order id format is invalid, it should return 400", async () => {
      // Act
      const response = await request
        .patch("/api/v1/orders/invalid-id/ship")
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Business Logic Validation - Domain Errors", () => {
    test("when order has no tracking number, it should return 404", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      await progressOrderTo(container, order.id, OrderStatus.CONFIRMED);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test.each([
      OrderStatus.PRE_TRANSIT,
      OrderStatus.SHIPPING,
      OrderStatus.DELIVERED,
      OrderStatus.RETURNED,
      OrderStatus.SUSPENDED,
      OrderStatus.CANCELLED,
    ])(
      "when order is %s, it should return 400 (invalid status transition)",
      async (status) => {
        // Arrange
        const user = userFactory();
        await createUserInDB(container, user);

        const order = await setupOrderInDB(container, {
          owner: user,
        });

        order.setTrackingNumber("TRACK123456");
        await saveOrderInDB(container, order);

        await progressOrderTo(container, order.id, status);

        // Act
        const response = await request
          .patch(`/api/v1/orders/${order.id.value}/ship`)
          .set("authorization", adminAuth());

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
      },
    );
  });

  describe("New State Validation - DB Changes", () => {
    test("when shipping a confirmed order, it should update order status to PRE_TRANSIT", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      order.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, order);

      await progressOrderTo(container, order.id, OrderStatus.CONFIRMED);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", adminAuth());

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const updatedOrder = await orderRepository.find(order.id);

      expect(updatedOrder).not.toBeNull();
      expect(updatedOrder!.getStatus()).toBe(OrderStatus.PRE_TRANSIT);
    });

    test("when shipping an order, it should schedule a CREATE_SHIPMENT_IN_SHIPPING_API job", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      const trackingNumber = "TRACK123456";
      order.setTrackingNumber(trackingNumber);
      await saveOrderInDB(container, order);

      await progressOrderTo(container, order.id, OrderStatus.CONFIRMED);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxJob(
        container,
        OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API,
        {
          trackingNumber,
        },
      );
    });
  });

  describe("Event Persistence - Outbox", () => {
    test("when shipping a confirmed order, it should persist OrderMarkedAsPreTransit event to outbox", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      const trackingNumber = "TRACK123456";
      order.setTrackingNumber(trackingNumber);
      await saveOrderInDB(container, order);

      await progressOrderTo(container, order.id, OrderStatus.CONFIRMED);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", adminAuth());

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.ORDER_MARKED_AS_PRE_TRANSIT,
        order.id.value,
      );

      expect(event.payload).toMatchObject({
        aggregateId: order.id.value,
        userId: order.userId.value,
        trackingNumber,
        selectedShippingProvider: order.getSelectedShippingProvider(),
      });
    });

    test("when shipping an order, exactly one OrderMarkedAsPreTransit event should be persisted", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      order.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, order);

      await progressOrderTo(container, order.id, OrderStatus.CONFIRMED);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.ORDER_MARKED_AS_PRE_TRANSIT,
        1,
      );
    });

    test("when shipping an order, it should persist OrderMarkedAsPreTransit event AND schedule a CREATE_SHIPMENT_IN_SHIPPING_API job", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      const trackingNumber = "TRACK123456";
      order.setTrackingNumber(trackingNumber);
      await saveOrderInDB(container, order);

      await progressOrderTo(container, order.id, OrderStatus.CONFIRMED);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", adminAuth());

      // Assert

      await expectOutboxEvent(
        container,
        DomainEventCode.ORDER_MARKED_AS_PRE_TRANSIT,
        order.id.value,
      );

      await expectOutboxJob(
        container,
        OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API,
        {
          trackingNumber,
        },
      );
    });
  });

  describe("Edge Cases", () => {
    test("when multiple orders are shipped, each should have its own OrderMarkedAsPreTransit event", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order1 = await setupOrderInDB(container, { owner: user });
      const order2 = await setupOrderInDB(container, { owner: user });

      order1.setTrackingNumber("TRACK111111");
      order2.setTrackingNumber("TRACK222222");

      await saveOrderInDB(container, order1);
      await saveOrderInDB(container, order2);

      await progressOrderTo(container, order1.id, OrderStatus.CONFIRMED);
      await progressOrderTo(container, order2.id, OrderStatus.CONFIRMED);

      // Act
      await request
        .patch(`/api/v1/orders/${order1.id.value}/ship`)
        .set("authorization", adminAuth());

      await request
        .patch(`/api/v1/orders/${order2.id.value}/ship`)
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.ORDER_MARKED_AS_PRE_TRANSIT,
        2,
      );
    });

    test("shipping an order should update the updatedAt timestamp", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      order.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, order);

      const latestOrder = await progressOrderTo(
        container,
        order.id,
        OrderStatus.CONFIRMED,
      );

      const beforeUpdate = latestOrder.getUpdatedAt();

      // Act - Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await request
        .patch(`/api/v1/orders/${order.id.value}/ship`)
        .set("authorization", adminAuth());

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const updatedOrder = await orderRepository.find(order.id);

      expect(updatedOrder!.getUpdatedAt().getTime()).toBeGreaterThan(
        beforeUpdate.getTime(),
      );
    });
  });
});
