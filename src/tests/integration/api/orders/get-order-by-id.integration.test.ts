import type { Container } from "#/composition/container.js";
import {
  clearDatabase,
  createUserInDB,
  setupOrderInDB,
} from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { User } from "#/domain/entities/user.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { ORDER_REPOSITORY } from "#/composition/tokens.js";

describe("GET /api/v1/orders/single/:id", () => {
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
    test("when client requests own order by id, it should return 200 with full order details", async () => {
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
        .get(`/api/v1/orders/single/${order.id.value}`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: order.id.value,
          userId: user.id.value,
          trackingNumber: order.getTrackingNumber(),
          status: order.getStatus(),
          shippingStatus: order.getShippingStatus(),
          shippingPriceAtOrderTime: expect.objectContaining({
            amount: expect.any(Number),
            currency: "DZD",
          }),
          selectedShippingProvider: "WORLD_EXPRESS",
          shippingDetails: expect.objectContaining({
            deliveryType: expect.any(String),
            fullName: expect.any(String),
            firstPhone: expect.any(String),
            wilayaCode: expect.any(Number),
            commune: expect.any(String),
            postalCode: expect.any(String),
            address: expect.any(String),
            fragile: expect.any(Boolean),
          }),
          orderItems: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              variation: expect.objectContaining({
                id: expect.any(String),
                size: expect.any(String),
                color: expect.any(String),
                totalQty: expect.any(Number),
                reservedQty: expect.any(Number),
                availableQty: expect.any(Number),
                isInStock: expect.any(Boolean),
                weightInGrams: expect.objectContaining({
                  weight: expect.any(Number),
                  unit: expect.any(String),
                }),
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
              }),
              qty: expect.any(Number),
              unitPriceAtOrderTime: expect.objectContaining({
                amount: expect.any(Number),
                currency: "DZD",
              }),
              lineTotal: expect.objectContaining({
                amount: expect.any(Number),
                currency: "DZD",
              }),
              hasDiscount: expect.any(Boolean),
            }),
          ]),
          totalOrderPrice: expect.objectContaining({
            amount: expect.any(Number),
            currency: "DZD",
          }),
          totalItemsPrice: expect.objectContaining({
            amount: expect.any(Number),
            currency: "DZD",
          }),
          totalDiscount: expect.objectContaining({
            amount: expect.any(Number),
            currency: "DZD",
          }),
          totalWeightInGrams: expect.objectContaining({
            weight: expect.any(Number),
            unit: expect.any(String),
          }),
          totalWeightInKg: expect.objectContaining({
            weight: expect.any(Number),
            unit: expect.any(String),
          }),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );
      expect(response.body.orderItems).toHaveLength(2);
    });

    test("when admin requests any order by id, it should return 200", async () => {
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
        .get(`/api/v1/orders/single/${order.id.value}`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(order.id.value);
      expect(response.body.userId).toBe(client.id.value);
    });

    test("when client requests another user's order, it should return 403", async () => {
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

      const order = await setupOrderInDB(container, { owner });

      // Act
      const response = await request
        .get(`/api/v1/orders/single/${order.id.value}`)
        .set("authorization", `Bearer test-client-token ${intruder.id.value}`);

      // Assert
      expect(response.status).toBe(403);
    });

    test("when order does not exist, it should return 404", async () => {
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
        .get(`/api/v1/orders/single/${OrderId.generate().value}`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Act
      const response = await request.get(
        `/api/v1/orders/single/${OrderId.generate().value}`,
      );

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe("New State Validation", () => {
    test("when order is fetched, DB state should not change", async () => {
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
        .get(`/api/v1/orders/single/${order.id.value}`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const fetchedOrder = await orderRepository.find(order.id);

      expect(fetchedOrder).not.toBeNull();
      expect(fetchedOrder!.getStatus()).toBe(order.getStatus());
    });
  });
});
