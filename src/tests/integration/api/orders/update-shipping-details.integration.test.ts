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
import { OrderId } from "#/domain/value-objects/order-id.js";
import { OutboxAction } from "#/application/repositories/outbox.repository.js";

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
    test("when admin updates shipping details of a pending order, it should return 200 with success true", async () => {
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

      const body = createValidShippingDetailsBody();

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when admin updates shipping details of a confirmed order, it should return 200 with success true", async () => {
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

      const body = createValidShippingDetailsBody();

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", "Bearer test-admin-token");

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

      const body = createValidShippingDetailsBody();

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

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
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when phone number is invalid, it should return 400", async () => {
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

      const body = createValidShippingDetailsBody({
        phone: "1234567890",
      });

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when phone2 is invalid, it should return 400", async () => {
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

      const body = createValidShippingDetailsBody({
        phone2: "1234567890",
      });

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when gpsLink is invalid URL, it should return 400", async () => {
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

      const body = createValidShippingDetailsBody({
        gpsLink: "invalid-url",
      });

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Business Logic Validation - Domain Errors", () => {
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
      orderFromDB!.setTrackingNumber("TRACK123456");
      orderFromDB!.markAsPreTransit();
      await saveOrderInDB(container, orderFromDB!);

      const body = createValidShippingDetailsBody();

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
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
      orderFromDB!.setTrackingNumber("TRACK123456");
      orderFromDB!.markAsPreTransit();
      orderFromDB!.markAsShipping();
      await saveOrderInDB(container, orderFromDB!);

      const body = createValidShippingDetailsBody();

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
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
      orderFromDB!.setTrackingNumber("TRACK123456");
      orderFromDB!.markAsPreTransit();
      orderFromDB!.markAsShipping();
      orderFromDB!.markAsDelivered();
      await saveOrderInDB(container, orderFromDB!);

      const body = createValidShippingDetailsBody();

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
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
      orderFromDB!.setTrackingNumber("TRACK123456");
      orderFromDB!.markAsPreTransit();
      orderFromDB!.markAsShipping();
      orderFromDB!.markAsReturned();
      await saveOrderInDB(container, orderFromDB!);

      const body = createValidShippingDetailsBody();

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
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

      const body = createValidShippingDetailsBody();

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
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
      orderFromDB!.setTrackingNumber("TRACK123456");
      orderFromDB!.markAsPreTransit();
      orderFromDB!.markAsShipping();
      orderFromDB!.markAsSuspended();
      await saveOrderInDB(container, orderFromDB!);

      const body = createValidShippingDetailsBody();

      // Act
      const response = await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("New State Validation - DB Changes", () => {
    test("when updating shipping details of a pending order, it should update all fields", async () => {
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
        .set("authorization", "Bearer test-admin-token");

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
        .set("authorization", "Bearer test-admin-token");

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

      const body = createValidShippingDetailsBody({
        clientName: "Updated Name",
        address: "Updated Address",
      });

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const updatedOrder = await orderRepository.find(order.id);
      const shippingDetails = updatedOrder!.getShippingDetails();

      expect(shippingDetails.getFullName()).toBe("Updated Name");
      expect(shippingDetails.getAddress()).toBe("Updated Address");
    });

    test("when updating shipping details, it should schedule an UPDATE_ORDER_IN_SHIPPING_API job", async () => {
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

      orderFromDB!.setTrackingNumber("TRACK123456");
      await saveOrderInDB(container, orderFromDB!);

      const body = createValidShippingDetailsBody();

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const jobs = await outboxRepository.getPendingJobs(100);

      const updateJob = jobs.find(
        (j) => j.eventType === OutboxAction.UPDATE_ORDER_IN_SHIPPING_API,
      );
      expect(updateJob).toBeDefined();
      expect(updateJob!.payload).toMatchObject({
        orderId: order.id.value,
      });
    });
  });

  describe("Event Persistence - Outbox", () => {
    test("when updating shipping details, it should persist OrderShippingDetailsUpdated event to outbox", async () => {
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

      const body = createValidShippingDetailsBody();

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const shippingDetailsUpdatedEvent = events.find(
        (e) => e.eventType === DomainEventCode.ORDER_SHIPPING_DETAILS_UPDATED,
      );
      expect(shippingDetailsUpdatedEvent).toBeDefined();
      expect(shippingDetailsUpdatedEvent!.aggregateId).toBe(order.id.value);
    });

    test("when updating shipping details, exactly one OrderShippingDetailsUpdated event should be persisted", async () => {
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

      const body = createValidShippingDetailsBody();

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const shippingDetailsUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.ORDER_SHIPPING_DETAILS_UPDATED,
      );
      expect(shippingDetailsUpdatedEvents).toHaveLength(1);
    });

    test("when updating shipping details, it should persist OrderShippingDetailsUpdated event AND schedule an UPDATE_ORDER_IN_SHIPPING_API job", async () => {
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

      orderFromDB!.setTrackingNumber("TRACK789012");
      await saveOrderInDB(container, orderFromDB!);

      const body = createValidShippingDetailsBody();

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);

      // Check events
      const events = await outboxRepository.getPendingEvents(100);
      const shippingDetailsUpdatedEvent = events.find(
        (e) => e.eventType === DomainEventCode.ORDER_SHIPPING_DETAILS_UPDATED,
      );
      expect(shippingDetailsUpdatedEvent).toBeDefined();
      expect(shippingDetailsUpdatedEvent!.aggregateId).toBe(order.id.value);

      // Check jobs
      const jobs = await outboxRepository.getPendingJobs(100);
      const updateJob = jobs.find(
        (j) => j.eventType === OutboxAction.UPDATE_ORDER_IN_SHIPPING_API,
      );
      expect(updateJob).toBeDefined();
      expect(updateJob!.payload).toMatchObject({
        orderId: order.id.value,
      });
    });

    test("when updating shipping details, the event and job should be persisted in the same transaction", async () => {
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

      const body = createValidShippingDetailsBody();

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);

      const events = await outboxRepository.getPendingEvents(100);
      const shippingDetailsUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.ORDER_SHIPPING_DETAILS_UPDATED,
      );
      expect(shippingDetailsUpdatedEvents).toHaveLength(1);

      const jobs = await outboxRepository.getPendingJobs(100);
      const updateJobs = jobs.filter(
        (j) => j.eventType === OutboxAction.UPDATE_ORDER_IN_SHIPPING_API,
      );
      expect(updateJobs).toHaveLength(1);
    });
  });

  describe("Edge Cases", () => {
    test("when updating shipping details with partial data (only clientName), it should only update that field", async () => {
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
        .set("authorization", "Bearer test-admin-token");

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
      // we have to re-read order from DB and then modify it, because if we don't, the order will always have the isNew flag set to true, and it will always be freshly created, never updated
      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.setTrackingNumber("TRACK555555");

      await saveOrderInDB(container, orderFromDB!);

      const body = createValidShippingDetailsBody();

      // Act
      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const jobs = await outboxRepository.getPendingJobs(100);

      const updateJob = jobs.find(
        (j) => j.eventType === OutboxAction.UPDATE_ORDER_IN_SHIPPING_API,
      );
      expect(updateJob).toBeDefined();
      expect(updateJob!.payload).toMatchObject({
        orderId: order.id.value,
      });
    });

    test("updating shipping details should update the updatedAt timestamp", async () => {
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

      const body = createValidShippingDetailsBody();

      // Act - Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await request
        .patch(`/api/v1/orders/${order.id.value}/shipping-details`)
        .send(body)
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
