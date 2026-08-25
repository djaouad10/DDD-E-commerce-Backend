import type { Container } from "#/composition/container.js";
import {
  clearDatabase,
  createCategoryInDB,
  createProductInDB,
  createUserInDB,
  saveCartInDB,
} from "#/tests/helpers/db-helpers.js";
import { productFactory } from "#/tests/helpers/domain-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { User } from "#/domain/entities/user.js";
import { Category } from "#/domain/entities/category.js";
import { Cart } from "#/domain/entities/cart.js";
import { CartItem } from "#/domain/entities/cart-item.js";
import {
  CART_REPOSITORY,
  ORDER_REPOSITORY,
  OUTBOX_REPOSITORY,
  PRODUCT_REPOSITORY,
} from "#/composition/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { env } from "#/infrastructure/config/env.js";
import { OrderStatus, ShippingProvider } from "#/domain/entities/order.js";
import { DeliveryType } from "#/domain/value-objects/shipping-details.js";
import { OrderId } from "#/domain/value-objects/order-id.js";

describe("POST /api/v1/orders", () => {
  let app: Express;
  let container: Container;
  let request: ReturnType<typeof supertest>;

  // Helper to create valid request body
  function createValidOrderBody(
    overrides: Partial<{
      idempotencyKey: string;
      providedShippingPrice: number;
      selectedShippingProvider: string;
      shippingDetails: Partial<{
        fullName: string;
        firstPhone: string;
        secondPhone?: string;
        wilayaCode: number;
        commune: string;
        postalCode: string;
        address: string;
        gpsLink?: string;
        clientNote?: string;
        deliveryType: string;
        fragile: boolean;
      }>;
    }> = {},
  ) {
    const validAlgerianPhoneNumber = "0678876545";
    const idempotencyKey = "123e4567-e89b-12d3-a456-426614174000";

    return {
      idempotencyKey: overrides.idempotencyKey ?? idempotencyKey,
      providedShippingPrice: overrides.providedShippingPrice ?? 350,
      selectedShippingProvider:
        overrides.selectedShippingProvider ?? ShippingProvider.WORLD_EXPRESS,
      shippingDetails: {
        fullName: overrides.shippingDetails?.fullName ?? "John Doe",
        firstPhone:
          overrides.shippingDetails?.firstPhone ?? validAlgerianPhoneNumber,
        secondPhone: overrides.shippingDetails?.secondPhone,
        wilayaCode: overrides.shippingDetails?.wilayaCode ?? 16,
        commune: overrides.shippingDetails?.commune ?? "Algiers",
        postalCode: overrides.shippingDetails?.postalCode ?? "16000",
        address: overrides.shippingDetails?.address ?? "123 Main St",
        gpsLink: overrides.shippingDetails?.gpsLink,
        clientNote: overrides.shippingDetails?.clientNote,
        deliveryType:
          overrides.shippingDetails?.deliveryType ?? DeliveryType.TO_DESK,
        fragile: overrides.shippingDetails?.fragile ?? false,
      },
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
    nock(env.WORLD_EXPRESS_API_URL)
      .get("/get/fees")
      .reply(200, {
        livraison: [{ wilaya_id: 16, tarif: "400", tarif_stopdesk: "350" }],
        pickup: [],
        echange: [],
        recouvrement: [],
        retours: [],
      });

    nock(env.WORLD_EXPRESS_API_URL)
      .get("/get/communes")
      .query({ wilaya_id: "16" })
      .reply(200, [
        {
          nom: "Algiers",
          wilaya_id: 16,
          code_postal: "16000",
          has_stop_desk: 1,
        },
      ]);

    await clearDatabase(container);
  });

  describe("Response Validation - HTTP Layer & Validation Errors", () => {
    test("when called with valid data and client token, it should return 200 with orderId", async () => {
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

      const body = createValidOrderBody();

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        orderId: expect.any(String),
      });
      expect(response.body.orderId).toMatch(/^ord_[a-zA-Z0-9]{32}$/);
    });

    test("when called with valid data and admin token, it should return 200 with orderId", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "ADMIN",
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

      const body = createValidOrderBody();

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-admin-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        orderId: expect.any(String),
      });
      expect(response.body.orderId).toMatch(/^ord_[a-zA-Z0-9]{32}$/);
    });

    test("when called with TO_HOME delivery, it should use home delivery fee", async () => {
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

      const body = createValidOrderBody({
        providedShippingPrice: 400,
        shippingDetails: {
          deliveryType: DeliveryType.TO_HOME,
        },
      });

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.orderId).toBeDefined();
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const body = createValidOrderBody();

      // Act
      const response = await request.post("/api/v1/orders").send(body);

      // Assert
      expect(response.status).toBe(401);
    });

    test("when idempotencyKey is invalid (not UUID), it should return 400", async () => {
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

      const body = createValidOrderBody({
        idempotencyKey: "invalid-key",
      });

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when providedShippingPrice is negative, it should return 400", async () => {
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

      const body = createValidOrderBody({
        providedShippingPrice: -100,
      });

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when selectedShippingProvider is invalid, it should return 400", async () => {
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

      const body = createValidOrderBody({
        selectedShippingProvider: "INVALID_PROVIDER",
      });

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when wilayaCode is out of range (0), it should return 400", async () => {
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

      const body = createValidOrderBody({
        shippingDetails: {
          wilayaCode: 0,
        },
      });

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when wilayaCode is out of range (70), it should return 400", async () => {
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

      const body = createValidOrderBody({
        shippingDetails: {
          wilayaCode: 70,
        },
      });

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

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

      const body = createValidOrderBody({
        shippingDetails: {
          firstPhone: "1234567890",
        },
      });

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when postal code is invalid, it should return 400", async () => {
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

      const body = createValidOrderBody({
        shippingDetails: {
          postalCode: "invalid",
        },
      });

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Business Logic Validation - Service Layer Errors", () => {
    test("when user is banned, it should return 403", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        true, // Banned
      );

      await createUserInDB(container, user);

      const body = createValidOrderBody();

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);
      // Assert
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });

    test("when user does not exist, it should return 404", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      // User not saved in DB

      const body = createValidOrderBody();
      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);
      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when cart is empty, it should return 400", async () => {
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
      // Empty cart - no items added
      const cart = Cart.create(user.id, []);
      await saveCartInDB(container, cart);

      const body = createValidOrderBody();

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);
      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when provided shipping price doesn't match provider's price, it should return 400", async () => {
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
      // Mock WorldExpress API calls

      const body = createValidOrderBody({
        providedShippingPrice: 999, // Wrong price
      });
      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);
      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when postal code doesn't exist in the wilaya, it should return 400", async () => {
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

      const body = createValidOrderBody({
        shippingDetails: {
          postalCode: "99999", // Non-existent postal code
        },
      });

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);
      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("External Gateway Errors - WorldExpress API", () => {
    test("when WorldExpress API returns 500, it should return 502", async () => {
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

      // Mock WorldExpress API errors

      nock.cleanAll();

      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/fees")
        .reply(500, { error: "Internal Server Error" });

      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/communes")
        .query({ wilaya_id: "16" })
        .reply(500, { error: "Internal Server Error" });

      const body = createValidOrderBody();

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(502);
      expect(response.body.error.code).toBe("GATEWAY_ERROR");
    });

    test("when WorldExpress API returns 404 for wilaya, it should return 404", async () => {
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

      nock.cleanAll();

      // Mock WorldExpress API calls
      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/fees")
        .reply(200, {
          livraison: [
            {
              wilaya_id: 1, // our shipping details wilaya is 16 (not found in this result)
              tarif: "400",
              tarif_stopdesk: "350",
            },
          ],
          pickup: [],
          echange: [],
          recouvrement: [],
          retours: [],
        });

      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/communes")
        .query({ wilaya_id: "16" })
        .reply(200, [
          {
            nom: "Algiers",
            wilaya_id: 16,
            code_postal: "16000",
            has_stop_desk: 1,
          },
        ]);

      const body = createValidOrderBody({
        shippingDetails: { wilayaCode: 16 },
      });

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when WorldExpress API returns 422 validation error, it should return 400", async () => {
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

      // Mock WorldExpress API calls
      nock.cleanAll();

      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/fees")
        .reply(422, {
          message: "The given data was invalid.",
          errors: {
            wilaya_id: ["The wilaya id field is required."],
          },
        });

      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/communes")
        .query({ wilaya_id: "16" })
        .reply(422, {
          message: "The given data was invalid.",
          errors: {
            wilaya_id: ["The wilaya id field is required."],
          },
        });

      const body = createValidOrderBody();

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when WorldExpress API times out, it should return 504", async () => {
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

      // Mock WorldExpress API timeout
      nock.cleanAll();

      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/fees")
        .delay(6000) // timeout in integration tests fetch client composition root instance is configured to 5000 ms
        .reply(200, {
          livraison: [{ wilaya_id: 16, tarif: "400", tarif_stopdesk: "350" }],
          pickup: [],
          echange: [],
          recouvrement: [],
          retours: [],
        });

      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/communes")
        .query({ wilaya_id: "16" })
        .reply(200, [
          {
            nom: "Algiers",
            wilaya_id: 16,
            code_postal: "16000",
            has_stop_desk: 1,
          },
        ]);

      const body = createValidOrderBody({
        providedShippingPrice: 350,
        shippingDetails: { deliveryType: DeliveryType.TO_DESK },
      });

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      expect(response.status).toBe(504);
      expect(response.body.error.code).toBe("GATEWAY_TIMEOUT_ERROR");
    }, 10000);
  });

  describe("New State Validation - DB Changes", () => {
    test("when called with valid data, it should create an order in the database", async () => {
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

      // Mock WorldExpress API calls
      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/fees")
        .reply(200, {
          livraison: [{ wilaya_id: 16, tarif: "400", tarif_stopdesk: "350" }],
          pickup: [],
          echange: [],
          recouvrement: [],
          retours: [],
        });

      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/communes")
        .query({ wilaya_id: "16" })
        .reply(200, [
          {
            nom: "Algiers",
            wilaya_id: 16,
            code_postal: "16000",
            has_stop_desk: 1,
          },
        ]);

      const body = createValidOrderBody({
        providedShippingPrice: 350,
        shippingDetails: { deliveryType: DeliveryType.TO_DESK },
      });

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const order = await orderRepository.find(
        OrderId.of(response.body.orderId),
      );

      expect(order).not.toBeNull();
      expect(order!.userId.value).toBe(user.id.value);
      expect(order!.getStatus()).toBe(OrderStatus.PENDING);
      expect(order!.getOrderItems()).toHaveLength(1);
      expect(order!.getOrderItems()[0]!.qty).toBe(2);
      expect(order!.getOrderItems()[0]!.variationId.value).toBe(
        variation.id.value,
      );
    });

    test("when called with valid data, it should clear the user's cart", async () => {
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

      // Mock WorldExpress API calls
      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/fees")
        .reply(200, {
          livraison: [{ wilaya_id: 16, tarif: "400", tarif_stopdesk: "350" }],
          pickup: [],
          echange: [],
          recouvrement: [],
          retours: [],
        });

      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/communes")
        .query({ wilaya_id: "16" })
        .reply(200, [
          {
            nom: "Algiers",
            wilaya_id: 16,
            code_postal: "16000",
            has_stop_desk: 1,
          },
        ]);

      const body = createValidOrderBody({
        providedShippingPrice: 350,
        shippingDetails: { deliveryType: DeliveryType.TO_DESK },
      });

      // Act
      await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const cartRepository = container.resolveSingleton(CART_REPOSITORY);
      const updatedCart = await cartRepository.findByUserId(user.id);

      expect(updatedCart.getItems()).toHaveLength(0);
    });

    test("when called with valid data, it should reserve stock for the ordered items", async () => {
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
      const initialReservedQty = variation.getReservedQty();
      const initialTotalQty = variation.getTotalQty();

      await createUserInDB(container, user);
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const cart = Cart.create(user.id, [CartItem.create(variation.id, 2)]);
      await saveCartInDB(container, cart);

      // Mock WorldExpress API calls
      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/fees")
        .reply(200, {
          livraison: [{ wilaya_id: 16, tarif: "400", tarif_stopdesk: "350" }],
          pickup: [],
          echange: [],
          recouvrement: [],
          retours: [],
        });

      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/communes")
        .query({ wilaya_id: "16" })
        .reply(200, [
          {
            nom: "Algiers",
            wilaya_id: 16,
            code_postal: "16000",
            has_stop_desk: 1,
          },
        ]);

      const body = createValidOrderBody({
        providedShippingPrice: 350,
        shippingDetails: { deliveryType: DeliveryType.TO_DESK },
      });

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert - Re-fetch product to see updated reserved quantity
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);
      const updatedVariation = updatedProduct!.getVariation(variation.id)!;

      // Reserved quantity should have increased by 2 (the qty ordered)
      expect(updatedVariation.getReservedQty()).toBe(initialReservedQty + 2);

      // Available quantity should have decreased by 2
      expect(updatedVariation.getAvailableQty()).toBe(
        initialTotalQty - (initialReservedQty + 2),
      );

      // Verify the order was created
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const order = await orderRepository.find(
        OrderId.of(response.body.orderId),
      );
      expect(order).not.toBeNull();
      expect(order!.getOrderItems()).toHaveLength(1);
      expect(order!.getOrderItems()[0]!.qty).toBe(2);
    });
  });

  describe("Event Persistence - Outbox", () => {
    test("when called with valid data, it should persist OrderCreated event to outbox", async () => {
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

      // Mock WorldExpress API calls
      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/fees")
        .reply(200, {
          livraison: [{ wilaya_id: 16, tarif: "400", tarif_stopdesk: "350" }],
          pickup: [],
          echange: [],
          recouvrement: [],
          retours: [],
        });

      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/communes")
        .query({ wilaya_id: "16" })
        .reply(200, [
          {
            nom: "Algiers",
            wilaya_id: 16,
            code_postal: "16000",
            has_stop_desk: 1,
          },
        ]);

      const body = createValidOrderBody({
        providedShippingPrice: 350,
        shippingDetails: { deliveryType: DeliveryType.TO_DESK },
      });

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const orderCreatedEvent = events.find(
        (e) => e.eventType === DomainEventCode.ORDER_CREATED,
      );
      expect(orderCreatedEvent).toBeDefined();
      expect(orderCreatedEvent!.aggregateId).toBe(response.body.orderId);
    });

    test("when called with valid data, it should persist CartCleared event to outbox", async () => {
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

      // Mock WorldExpress API calls
      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/fees")
        .reply(200, {
          livraison: [{ wilaya_id: 16, tarif: "400", tarif_stopdesk: "350" }],
          pickup: [],
          echange: [],
          recouvrement: [],
          retours: [],
        });

      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/communes")
        .query({ wilaya_id: "16" })
        .reply(200, [
          {
            nom: "Algiers",
            wilaya_id: 16,
            code_postal: "16000",
            has_stop_desk: 1,
          },
        ]);

      const body = createValidOrderBody({
        providedShippingPrice: 350,
        shippingDetails: { deliveryType: DeliveryType.TO_DESK },
      });

      // Act
      await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const cartClearedEvent = events.find(
        (e) => e.eventType === DomainEventCode.CART_CLEARED,
      );
      expect(cartClearedEvent).toBeDefined();
      expect((cartClearedEvent!.payload as any).userId).toBe(user.id.value);
    });

    test("when called with valid data, it should persist StockReserved events to outbox", async () => {
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

      // Mock WorldExpress API calls
      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/fees")
        .reply(200, {
          livraison: [{ wilaya_id: 16, tarif: "400", tarif_stopdesk: "350" }],
          pickup: [],
          echange: [],
          recouvrement: [],
          retours: [],
        });

      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/communes")
        .query({ wilaya_id: "16" })
        .reply(200, [
          {
            nom: "Algiers",
            wilaya_id: 16,
            code_postal: "16000",
            has_stop_desk: 1,
          },
        ]);

      const body = createValidOrderBody({
        providedShippingPrice: 350,
        shippingDetails: { deliveryType: DeliveryType.TO_DESK },
      });

      // Act
      await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const stockReservedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.STOCK_RESERVED,
      );
      expect(stockReservedEvents).toHaveLength(1);
      expect((stockReservedEvents[0]!.payload as any).variationId).toBe(
        variation.id.value,
      );
      expect((stockReservedEvents[0]!.payload as any).qty).toBe(2);
    });

    test("when called with valid data, all events should be persisted in the same transaction", async () => {
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

      // Mock WorldExpress API calls
      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/fees")
        .reply(200, {
          livraison: [{ wilaya_id: 16, tarif: "400", tarif_stopdesk: "350" }],
          pickup: [],
          echange: [],
          recouvrement: [],
          retours: [],
        });

      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/communes")
        .query({ wilaya_id: "16" })
        .reply(200, [
          {
            nom: "Algiers",
            wilaya_id: 16,
            code_postal: "16000",
            has_stop_desk: 1,
          },
        ]);

      const body = createValidOrderBody({
        providedShippingPrice: 350,
        shippingDetails: { deliveryType: DeliveryType.TO_DESK },
      });

      // Act
      await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const eventTypes = events.map((e) => e.eventType);
      expect(eventTypes).toContain(DomainEventCode.ORDER_CREATED);
      expect(eventTypes).toContain(DomainEventCode.CART_CLEARED);
      expect(eventTypes).toContain(DomainEventCode.STOCK_RESERVED);
    });
  });

  describe("Idempotency", () => {
    test("when called with the same idempotency key twice, it should return the same orderId", async () => {
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

      const idempotencyKey = "123e4567-e89b-12d3-a456-426614174000";
      const body = createValidOrderBody({ idempotencyKey });

      // Act - First request
      const firstResponse = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Act - Second request with same idempotency key
      const secondResponse = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(firstResponse.status).toBe(200);
      expect(secondResponse.status).toBe(200);
      expect(firstResponse.body.orderId).toBe(secondResponse.body.orderId);

      // Verify only one order was created
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const order = await orderRepository.find(
        OrderId.of(firstResponse.body.orderId),
      );
      expect(order).not.toBeNull();
    });
  });

  describe("Edge Cases", () => {
    test("when cart has multiple items, it should create an order with all items", async () => {
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

      const variation1 = product.getVariations()[0]!;
      const variation2 = product.getVariations()[1]!;
      const cart = Cart.create(user.id, [
        CartItem.create(variation1.id, 2),
        CartItem.create(variation2.id, 3),
      ]);
      await saveCartInDB(container, cart);

      const body = createValidOrderBody();

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const order = await orderRepository.find(
        OrderId.of(response.body.orderId),
      );

      expect(order!.getOrderItems()).toHaveLength(2);
      expect(
        order!
          .getOrderItems()
          .some((i) => i.variationId.value === variation1.id.value),
      ).toBe(true);
      expect(
        order!
          .getOrderItems()
          .some((i) => i.variationId.value === variation2.id.value),
      ).toBe(true);
    });

    test("when cart item has a discounted product, the order item should capture the discount", async () => {
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
      const product = productFactory({
        categoryId: category.id,
        price: 3000,
        discountPrice: 2500,
      });

      await createUserInDB(container, user);
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variation = product.getVariations()[0]!;
      const cart = Cart.create(user.id, [CartItem.create(variation.id, 2)]);
      await saveCartInDB(container, cart);

      const body = createValidOrderBody();

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const order = await orderRepository.find(
        OrderId.of(response.body.orderId),
      );

      const orderItem = order!.getOrderItems()[0]!;
      expect(orderItem.unitPriceAtOrderTime.amount).toBe(3000);
      expect(orderItem.unitDiscountPriceAtOrderTime!.amount).toBe(2500);
      expect(orderItem.hasDiscount()).toBe(true);
    });
  });
});
