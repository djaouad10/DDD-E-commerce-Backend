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
import { progressOrderTo } from "#/tests/helpers/order-lifecycle.js";
import {
  expectOutboxEvent,
  expectOutboxEventCount,
  expectOutboxJob,
} from "#/tests/helpers/outbox-assertions.js";

describe("PATCH /api/v1/orders/:id/confirm", () => {
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
    test("when admin confirms a pending order, it should return 200 with success true", async () => {
      // Arrange
      const user = userFactory();

      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when order does not exist, it should return 404", async () => {
      // Act
      const response = await request
        .patch(`/api/v1/orders/${OrderId.generate().value}/confirm`)
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

      // Act
      const response = await request.patch(
        `/api/v1/orders/${order.id.value}/confirm`,
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

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(403);
    });

    test("when order id format is invalid, it should return 400", async () => {
      // Act
      const response = await request
        .patch("/api/v1/orders/invalid-id/confirm")
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Business Logic Validation - Domain Errors", () => {
    test.each([
      OrderStatus.CONFIRMED,
      OrderStatus.CANCELLED,
      OrderStatus.PRE_TRANSIT,
      OrderStatus.SHIPPING,
      OrderStatus.DELIVERED,
      OrderStatus.RETURNED,
      OrderStatus.SUSPENDED,
    ])(
      "when order is %s, it should return 400 (invalid status transition)",
      async (status) => {
        // Arrange
        const user = userFactory();
        await createUserInDB(container, user);

        const order = await setupOrderInDB(container, {
          owner: user,
        });

        await progressOrderTo(container, order.id, status);

        // Act
        const response = await request
          .patch(`/api/v1/orders/${order.id.value}/confirm`)
          .set("authorization", adminAuth());

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
      },
    );
  });

  describe("New State Validation - DB Changes", () => {
    test("when confirming a pending order, it should update order status to CONFIRMED", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", adminAuth());

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const updatedOrder = await orderRepository.find(order.id);

      expect(updatedOrder).not.toBeNull();
      expect(updatedOrder!.getStatus()).toBe(OrderStatus.CONFIRMED);
    });

    test("when confirming an order without tracking number, it should schedule a CREATE_ORDER_IN_SHIPPING_API job", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxJob(
        container,
        OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
        {
          orderId: order.id.value,
        },
      );
    });
  });

  describe("Event Persistence - Outbox", () => {
    test("when confirming a pending order, it should persist OrderConfirmed event to outbox", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEvent(
        container,
        DomainEventCode.ORDER_CONFIRMED,
        order.id.value,
      );
    });

    test("when confirming an order, exactly one OrderConfirmed event should be persisted", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.ORDER_CONFIRMED,
        1,
      );
    });

    test("when confirming an order without tracking number, it should persist OrderConfirmed event AND schedule a CREATE_ORDER_IN_SHIPPING_API job", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEvent(
        container,
        DomainEventCode.ORDER_CONFIRMED,
        order.id.value,
      );

      await expectOutboxJob(
        container,
        OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
        {
          orderId: order.id.value,
        },
      );
    });
  });

  describe("Edge Cases", () => {
    test("when confirming an order that already has tracking number from previous operation, it should still schedule CREATE_ORDER_IN_SHIPPING_API job", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      order.setTrackingNumber("TRACK555555");
      await saveOrderInDB(container, order);

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
        .set("authorization", adminAuth());

      // Assert
      expectOutboxJob(container, OutboxAction.CREATE_ORDER_IN_SHIPPING_API, {
        orderId: order.id.value,
      });
    });

    test("when multiple orders are confirmed, each should have its own OrderConfirmed event", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order1 = await setupOrderInDB(container, { owner: user });
      const order2 = await setupOrderInDB(container, { owner: user });

      // Act
      await request
        .patch(`/api/v1/orders/${order1.id.value}/confirm`)
        .set("authorization", adminAuth());

      await request
        .patch(`/api/v1/orders/${order2.id.value}/confirm`)
        .set("authorization", adminAuth());

      // Assert
      expectOutboxEventCount(container, DomainEventCode.ORDER_CONFIRMED, 2);
    });

    test("confirming an order should update the updatedAt timestamp", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      const beforeUpdate = order.getUpdatedAt();

      // Act - Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await request
        .patch(`/api/v1/orders/${order.id.value}/confirm`)
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
