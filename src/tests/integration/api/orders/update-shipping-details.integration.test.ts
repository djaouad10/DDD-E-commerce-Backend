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
import { OrderId } from "#/domain/value-objects/order-id.js";
import { OutboxAction } from "#/application/ports/persistence/outbox.repository.port.js";
import { adminAuth, clientAuth } from "#/tests/helpers/auth-helpers.js";
import { userFactory } from "#/tests/helpers/domain-helpers.js";
import { OrderStatus } from "#/domain/entities/order.js";
import { progressOrderTo } from "#/tests/helpers/order-lifecycle.js";
import {
  expectOutboxEvent,
  expectOutboxEventCount,
  expectOutboxJob,
} from "#/tests/helpers/outbox-assertions.js";

describe("PATCH /api/v1/orders/:id/shipping-details", () => {
  let app: Express;
  let container: Container;
  let request: ReturnType<typeof supertest>;

  const validAlgerianPhoneNumber = "0678876545";

  function createValidShippingDetailsBody(
    overrides: Partial<{
      clientName: string;
      phone: string;
      phone2: string | null;
      address: string;
      note: string | null;
      isFragile: boolean;
      gpsLink: string | null;
    }> = {},
  ) {
    return {
      clientName: overrides.clientName ?? "Jane Doe",
      phone: overrides.phone ?? validAlgerianPhoneNumber,
      phone2: overrides.phone2 ?? null,
      address: overrides.address ?? "456 New Address St",
      note: overrides.note ?? null,
      isFragile: overrides.isFragile ?? true,
      gpsLink: overrides.gpsLink ?? null,
    };
  }

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
    test("when admin updates shipping details of a pending order, it should return 200 with success true", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      const body = createValidShippingDetailsBody();

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when admin updates shipping details of a confirmed order, it should return 200 with success true", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      order.confirm();
      await saveOrderInDB(container, order);

      const body = createValidShippingDetailsBody();

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when order does not exist, it should return 404", async () => {
      // Arrange
      const body = createValidShippingDetailsBody();

      // Act
      const response = await request
        .patch(`/api/v1/orders/${OrderId.generate().value}/shipping-details`)
        .send(body)
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

      const body = createValidShippingDetailsBody();

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body);

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

      const body = createValidShippingDetailsBody();

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(403);
    });

    test("when order id format is invalid, it should return 400", async () => {
      // Arrange
      const body = createValidShippingDetailsBody();

      // Act
      const response = await request
        .patch("/api/v1/orders/invalid-id/shipping-details")
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test.each([
      ["phone", { phone: "1234567890" }],
      ["phone2", { phone2: "1234567890" }],
      ["gpsLink", { gpsLink: "invalid-url" }],
    ])("when %s is invalid, it should return 400", async (_field, override) => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      const body = createValidShippingDetailsBody(override);

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Business Logic Validation - Domain Errors", () => {
    test.each([
      OrderStatus.CANCELLED,
      OrderStatus.DELIVERED,
      OrderStatus.RETURNED,
      OrderStatus.SUSPENDED,
      OrderStatus.PRE_TRANSIT,
      OrderStatus.SHIPPING,
    ])(
      "when order is %s, it should return 400 (invalid status transition)",
      async (status) => {
        const user = userFactory();
        await createUserInDB(container, user);

        const order = await setupOrderInDB(container, {
          owner: user,
        });

        order.setTrackingNumber("TRACK123456");
        await saveOrderInDB(container, order);

        await progressOrderTo(container, order.id, status);

        const body = createValidShippingDetailsBody();

        // Act
        const response = await request
          .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
          .send(body)
          .set("authorization", adminAuth());

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
      },
    );
  });

  describe("New State Validation - DB Changes", () => {
    test("when updating shipping details of a pending order, it should update all fields", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      const newClientName = "Jane Doe";
      const newPhone = "0777777777";
      const newPhone2 = "0788888888";
      const newAddress = "789 New Address St";
      const newNote = "Leave at reception";
      const newIsFragile = true;
      const newGpsLink = "https://maps.example.com/123";

      const body = {
        clientName: newClientName,
        phone: newPhone,
        phone2: newPhone2,
        address: newAddress,
        note: newNote,
        isFragile: newIsFragile,
        gpsLink: newGpsLink,
      };

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const updatedOrder = await orderRepository.find(order.id);
      const shippingDetails = updatedOrder!.getShippingDetails();

      expect(shippingDetails.getFullName()).toBe(newClientName);
      expect(shippingDetails.getFirstPhone()).toBe(newPhone);
      expect(shippingDetails.getSecondPhone()).toBe(newPhone2);
      expect(shippingDetails.getAddress()).toBe(newAddress);
      expect(shippingDetails.getClientNote()).toBe(newNote);
      expect(shippingDetails.getFragile()).toBe(newIsFragile);
      expect(shippingDetails.getGpsLink()).toBe(newGpsLink);
    });

    test("when updating shipping details with null values for optional fields, it should set them to null", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      const body = {
        clientName: "Jane Doe",
        phone: "0777777777",
        phone2: null,
        address: "789 New Address St",
        note: null,
        isFragile: true,
        gpsLink: null,
      };

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const updatedOrder = await orderRepository.find(order.id);
      const shippingDetails = updatedOrder!.getShippingDetails();

      expect(shippingDetails.getSecondPhone()).toBeNull();
      expect(shippingDetails.getClientNote()).toBeNull();
      expect(shippingDetails.getGpsLink()).toBeNull();
    });

    test("when updating shipping details of a confirmed order, it should update all fields", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      order.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, order);

      await progressOrderTo(container, order.id, OrderStatus.CONFIRMED);

      const body = createValidShippingDetailsBody({
        clientName: "Updated Name",
        address: "Updated Address",
      });

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const updatedOrder = await orderRepository.find(order.id);
      const shippingDetails = updatedOrder!.getShippingDetails();

      expect(shippingDetails.getFullName()).toBe("Updated Name");
      expect(shippingDetails.getAddress()).toBe("Updated Address");
    });

    test("when updating shipping details, it should schedule an UPDATE_ORDER_IN_SHIPPING_API job", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      order.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, order);

      const body = createValidShippingDetailsBody();

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxJob(
        container,
        OutboxAction.UPDATE_ORDER_IN_SHIPPING_API,
        {
          orderId: order.id.value,
        },
      );
    });
  });

  describe("Event Persistence - Outbox", () => {
    test("when updating shipping details, it should persist OrderShippingDetailsUpdated event to outbox", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      const body = createValidShippingDetailsBody();

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEvent(
        container,
        DomainEventCode.ORDER_SHIPPING_DETAILS_UPDATED,
        order.id.value,
      );
    });

    test("when updating shipping details, exactly one OrderShippingDetailsUpdated event should be persisted", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      const body = createValidShippingDetailsBody();

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.ORDER_SHIPPING_DETAILS_UPDATED,
        1,
      );
    });

    test("when updating shipping details, it should persist OrderShippingDetailsUpdated event AND schedule an UPDATE_ORDER_IN_SHIPPING_API job", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      order.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, order);
      await progressOrderTo(container, order.id, OrderStatus.CONFIRMED);

      const body = createValidShippingDetailsBody();

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEvent(
        container,
        DomainEventCode.ORDER_SHIPPING_DETAILS_UPDATED,
        order.id.value,
      );

      await expectOutboxJob(
        container,
        OutboxAction.UPDATE_ORDER_IN_SHIPPING_API,
        {
          orderId: order.id.value,
        },
      );
    });
  });

  describe("Edge Cases", () => {
    test("when updating shipping details with partial data (only clientName), it should only update that field", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      const originalShippingDetails = order.getShippingDetails();
      const originalAddress = originalShippingDetails.getAddress();
      const originalPhone = originalShippingDetails.getFirstPhone();

      const body = {
        clientName: "New Name Only",
        phone: originalPhone,
        address: originalAddress,
        isFragile: false,
      };

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const updatedOrder = await orderRepository.find(order.id);
      const shippingDetails = updatedOrder!.getShippingDetails();

      expect(shippingDetails.getFullName()).toBe("New Name Only");
      expect(shippingDetails.getAddress()).toBe(originalAddress);
      expect(shippingDetails.getFirstPhone()).toBe(originalPhone);
    });

    test("when updating shipping details of an order that already has tracking number, it should schedule UPDATE_ORDER_IN_SHIPPING_API job", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      order.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, order);

      await progressOrderTo(container, order.id, OrderStatus.CONFIRMED);

      const body = createValidShippingDetailsBody();

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxJob(
        container,
        OutboxAction.UPDATE_ORDER_IN_SHIPPING_API,
        {
          orderId: order.id.value,
        },
      );
    });

    test("updating shipping details should update the updatedAt timestamp", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, {
        owner: user,
      });

      const beforeUpdate = order.getUpdatedAt();

      const body = createValidShippingDetailsBody();

      // Act - Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
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
