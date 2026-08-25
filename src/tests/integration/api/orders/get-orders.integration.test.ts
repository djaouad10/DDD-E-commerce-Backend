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
import { ORDER_REPOSITORY } from "#/composition/tokens.js";

describe("GET /api/v1/orders", () => {
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
    test("when admin requests all orders, it should return 200 with paginated orders", async () => {
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

      const order = await setupOrderInDB(container, { owner: client });

      // Act
      const response = await request
        .get("/api/v1/orders")
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(1);
      expect(response.body.orders[0]).toEqual(
        expect.objectContaining({
          id: order.id.value,
          userId: client.id.value,
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

    test("when no orders exist, it should return empty array", async () => {
      // Act
      const response = await request
        .get("/api/v1/orders")
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.orders).toEqual([]);
      expect(response.body.nextCursor).toBeUndefined();
    });

    test("when using limit, it should return paginated results", async () => {
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
      await setupOrderInDB(container, { owner: client });

      // Act
      const response = await request
        .get("/api/v1/orders")
        .query({ limit: 1 })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(1);
      expect(response.body.nextCursor).toBeDefined();
    });

    test("when using cursor, it should return next page", async () => {
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
      await setupOrderInDB(container, { owner: client });

      const firstPage = await request
        .get("/api/v1/orders")
        .query({ limit: 1 })
        .set("authorization", "Bearer test-admin-token");

      const cursor = firstPage.body.nextCursor;
      expect(cursor).toBeDefined();

      // Act
      const response = await request
        .get("/api/v1/orders")
        .query({
          limit: 1,
          cursor: {
            createdAt: cursor.createdAt,
            orderId: cursor.orderId,
          },
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(1);
    });

    test("when filtering by status, it should return only matching orders", async () => {
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

      const pendingOrder = await setupOrderInDB(container, { owner: client });
      const confirmedOrder = await setupOrderInDB(container, { owner: client });
      confirmedOrder.confirm();

      await saveOrderInDB(container, pendingOrder);
      await saveOrderInDB(container, confirmedOrder);

      // Act
      const response = await request
        .get("/api/v1/orders")
        .query({ status: "CONFIRMED" })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.orders).toHaveLength(1);
      expect(response.body.orders[0].status).toBe("CONFIRMED");
    });

    test("when limit is invalid, it should return 400", async () => {
      // Act
      const response = await request
        .get("/api/v1/orders")
        .query({ limit: 0 })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when status is invalid, it should return 400", async () => {
      // Act
      const response = await request
        .get("/api/v1/orders")
        .query({ status: "INVALID_STATUS" })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when client token is used, it should return 403", async () => {
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

      // Act
      const response = await request
        .get("/api/v1/orders")
        .set("authorization", `Bearer test-client-token ${client.id.value}`);

      // Assert
      expect(response.status).toBe(403);
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Act
      const response = await request.get("/api/v1/orders");

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe("New State Validation", () => {
    test("when admin requests orders, DB state should not change", async () => {
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

      const order = await setupOrderInDB(container, { owner: client });

      // Act
      await request
        .get("/api/v1/orders")
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const fetchedOrder = await orderRepository.find(order.id);

      expect(fetchedOrder).not.toBeNull();
      expect(fetchedOrder!.getStatus()).toBe(order.getStatus());
    });
  });
});
