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
import { User } from "#/domain/entities/user.js";

import { UserId } from "#/domain/value-objects/user-id.js";
import { ORDER_REPOSITORY } from "#/composition/utils/tokens.js";

describe("GET /api/v1/orders/client", () => {
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

  describe("Response Validation", () => {
    test("when client requests own orders, it should return 200 with paginated orders", async () => {
      // Arrange
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );

      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, { owner: user });

      // Act
      const response = await request
        .get("/api/v1/orders/client")
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(1);
      expect(response.body.orders[0]).toEqual(
        expect.objectContaining({
          id: order.id.value,
          userId: user.id.value,
          status: order.getStatus(),
          trackingNumber: order.getTrackingNumber(),
          shippingStatus: order.getShippingStatus(),
          shippingPriceAtOrderTime: expect.objectContaining({
            amount: expect.any(Number),
            currency: "DZD",
          }),
          selectedShippingProvider: "WORLD_EXPRESS",
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );
      expect(response.body.nextCursor).toBeUndefined();
    });

    test("when client has no orders, it should return empty array", async () => {
      // Arrange
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      // Act
      const response = await request
        .get("/api/v1/orders/client")
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.orders).toEqual([]);
      expect(response.body.nextCursor).toBeUndefined();
    });

    test("when client uses limit, it should return paginated results", async () => {
      // Arrange
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );

      await createUserInDB(container, user);

      await setupOrderInDB(container, { owner: user });
      await setupOrderInDB(container, { owner: user });

      // Act
      const response = await request
        .get("/api/v1/orders/client")
        .query({ limit: 1 })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(1);
      expect(response.body.nextCursor).toBeDefined();
    });

    test("when client uses cursor, it should return next page", async () => {
      // Arrange
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );

      await createUserInDB(container, user);

      await setupOrderInDB(container, { owner: user });
      await setupOrderInDB(container, { owner: user });

      const firstPage = await request
        .get("/api/v1/orders/client")
        .query({ limit: 1 })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      const cursor = firstPage.body.nextCursor;
      expect(cursor).toBeDefined();

      // Act
      const response = await request
        .get("/api/v1/orders/client")
        .query({
          limit: 1,
          cursor: {
            createdAt: cursor.createdAt,
            orderId: cursor.orderId,
          },
        })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(1);
    });

    test("when client filters by status, it should return only matching orders", async () => {
      // Arrange
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );

      await createUserInDB(container, user);

      await setupOrderInDB(container, { owner: user });
      const confirmedOrder = await setupOrderInDB(container, { owner: user });

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);

      const confirmedOrderInDB = await orderRepo.find(confirmedOrder.id);

      confirmedOrderInDB!.confirm();

      await saveOrderInDB(container, confirmedOrderInDB!);

      // Act
      const response = await request
        .get("/api/v1/orders/client")
        .query({ status: "CONFIRMED" })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(1);
      expect(response.body.orders[0].status).toBe("CONFIRMED");
    });

    test("when admin requests orders by clientId, it should return 200 with client's orders", async () => {
      // Arrange
      const client = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );

      await createUserInDB(container, client);

      await setupOrderInDB(container, { owner: client });

      // Act
      const response = await request
        .get("/api/v1/orders/client")
        .query({ clientId: client.id.value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(1);
      expect(response.body.orders[0].userId).toBe(client.id.value);
    });

    test("when admin requests orders for non-existent client, it should return 200 with empty array", async () => {
      // Act
      const response = await request
        .get("/api/v1/orders/client")
        .query({ clientId: UserId.generate().value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.orders).toEqual([]);
      expect(response.body.nextCursor).toBeUndefined();
    });

    test("when limit is invalid, it should return 400", async () => {
      // Arrange
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      // Act
      const response = await request
        .get("/api/v1/orders/client")
        .query({ limit: 0 })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when status is invalid, it should return 400", async () => {
      // Arrange
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      // Act
      const response = await request
        .get("/api/v1/orders/client")
        .query({ status: "INVALID_STATUS" })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Act
      const response = await request.get("/api/v1/orders/client");

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe("New State Validation", () => {
    test("when client requests orders, DB state should not change", async () => {
      // Arrange
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, { owner: user });

      // Act
      await request
        .get("/api/v1/orders/client")
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const fetchedOrder = await orderRepository.find(order.id);

      expect(fetchedOrder).not.toBeNull();
      expect(fetchedOrder!.getStatus()).toBe(order.getStatus());
    });
  });
});
