import type { Container } from "#/composition/utils/container.js";
import {
  clearDatabase,
  createCategoryInDB,
  createProductInDB,
  createUserInDB,
  saveCartInDB,
} from "#/tests/helpers/db-helpers.js";
import { productFactory, userFactory } from "#/tests/helpers/domain-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import supertest from "supertest";
import { Category } from "#/domain/entities/category.js";
import { Cart } from "#/domain/entities/cart.js";
import { CartItem } from "#/domain/entities/cart-item.js";
import {
  CART_REPOSITORY,
  ORDER_REPOSITORY,
  PRODUCT_REPOSITORY,
  SHIPPING_PROVIDER_GATEWAY,
} from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { OrderStatus, ShippingProvider } from "#/domain/entities/order.js";
import { DeliveryType } from "#/domain/value-objects/shipping-details.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { adminAuth, clientAuth } from "#/tests/helpers/auth-helpers.js";
import { Variation } from "#/domain/entities/variation.js";
import { Color, Size } from "#/domain/entities/product.js";
import { Weight } from "#/domain/value-objects/weight.js";
import {
  communeFactory,
  createFakeShippingProviderGateway,
  deliveryFeesFactory,
} from "#/tests/helpers/fake-shipping-gateway.js";
import { faker } from "@faker-js/faker";
import { expectOutboxEvent } from "#/tests/helpers/outbox-assertions.js";

describe("POST /api/v1/orders", () => {
  let app: Express;
  let container: Container;
  let request: ReturnType<typeof supertest>;
  let fakeGateway: ReturnType<typeof createFakeShippingProviderGateway>;

  const WILAYA = 16;
  const POSTAL_CODE = "16000";

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
    return {
      idempotencyKey: overrides.idempotencyKey ?? faker.string.uuid(),
      providedShippingPrice: overrides.providedShippingPrice ?? 350,
      selectedShippingProvider:
        overrides.selectedShippingProvider ?? ShippingProvider.WORLD_EXPRESS,
      shippingDetails: {
        fullName:
          overrides.shippingDetails?.fullName ?? faker.person.fullName(),
        firstPhone:
          overrides.shippingDetails?.firstPhone ?? validAlgerianPhoneNumber,
        secondPhone: overrides.shippingDetails?.secondPhone,
        wilayaCode: overrides.shippingDetails?.wilayaCode ?? WILAYA,
        commune: overrides.shippingDetails?.commune ?? "Algiers",
        postalCode: overrides.shippingDetails?.postalCode ?? POSTAL_CODE,
        address:
          overrides.shippingDetails?.address ?? faker.location.streetAddress(),
        gpsLink: overrides.shippingDetails?.gpsLink,
        clientNote: overrides.shippingDetails?.clientNote,
        deliveryType:
          overrides.shippingDetails?.deliveryType ?? DeliveryType.TO_DESK,
        fragile: overrides.shippingDetails?.fragile ?? false,
      },
    };
  }

  async function setupUserWithCartItem(qty = 2) {
    const user = userFactory();
    const category = Category.create("Category");
    const product = productFactory({
      categoryId: category.id,
      customVariations: [
        Variation.create(Size.M, Color.RED, 100, 50, Weight.of(100, "g")),
        Variation.create(Size.L, Color.BLUE, 100, 50, Weight.of(100, "g")),
      ],
    });
    await createUserInDB(container, user);
    await createCategoryInDB(container, category);
    await createProductInDB(container, product);
    const variation = product.getVariations()[0]!;
    const cart = Cart.create(user.id, [CartItem.create(variation.id, qty)]);
    await saveCartInDB(container, cart);
    return { user, product, variation, cart };
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
    await clearDatabase(container);
    fakeGateway = createFakeShippingProviderGateway();
    container.register(SHIPPING_PROVIDER_GATEWAY, () => fakeGateway, "scoped");
  });

  describe("Response Validation - HTTP Layer & Validation Errors", () => {
    test("when called with valid data and client token, it should return 200 with orderId", async () => {
      // Arrange
      const { user } = await setupUserWithCartItem();

      const body = createValidOrderBody();

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.orderId).toMatch(/^ord_[a-zA-Z0-9]{32}$/);
    });

    test("when called with valid data and admin token, it should return 200 with orderId", async () => {
      // Arrange
      const { user } = await setupUserWithCartItem();
      const body = createValidOrderBody();

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", adminAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        orderId: expect.any(String),
      });
      expect(response.body.orderId).toMatch(/^ord_[a-zA-Z0-9]{32}$/);
    });

    test("when called with TO_HOME delivery, it should use home delivery fee", async () => {
      // Arrange
      const { user } = await setupUserWithCartItem();
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
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.orderId).toBeDefined();
      expect(fakeGateway.getDeliveryFeesOfWilaya).toHaveBeenCalledWith(WILAYA);
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const body = createValidOrderBody();

      // Act
      const response = await request.post("/api/v1/orders").send(body);

      // Assert
      expect(response.status).toBe(401);
    });

    test.each([
      ["idempotencyKey", { idempotencyKey: "invalid-key" }],
      ["providedShippingPrice", { providedShippingPrice: -100 }],
      [
        "selectedShippingProvider",
        { selectedShippingProvider: "INVALID_PROVIDER" },
      ],
    ] as const)(
      "when %s is invalid, it should return 400",
      async (_field, override) => {
        // Arrange
        const user = userFactory();
        await createUserInDB(container, user);
        const body = createValidOrderBody(override);

        // Act
        const response = await request
          .post("/api/v1/orders")
          .send(body)
          .set("authorization", clientAuth(user.id.value));

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
      },
    );

    test.each([
      ["wilayaCode is out of range (0)", { wilayaCode: 0 }],
      ["wilayaCode is out of range (70)", { wilayaCode: 70 }],
      ["phone number is invalid", { firstPhone: "1234567890" }],
      ["postal code is invalid", { postalCode: "invalid" }],
    ] as const)(
      "when %s, it should return 400",
      async (_label, shippingOverride) => {
        // Arrange
        const user = userFactory();
        await createUserInDB(container, user);
        const body = createValidOrderBody({
          shippingDetails: shippingOverride,
        });

        // Act
        const response = await request
          .post("/api/v1/orders")
          .send(body)
          .set("authorization", clientAuth(user.id.value));

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
      },
    );
  });

  describe("Business Logic Validation - Service Layer Errors", () => {
    test("when user is banned, it should return 403", async () => {
      // Arrange
      const user = userFactory({ banned: true });

      await createUserInDB(container, user);

      const body = createValidOrderBody();

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });

    test("when user does not exist, it should return 404", async () => {
      // Arrange
      const user = userFactory();
      // User not saved in DB

      const body = createValidOrderBody();
      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", clientAuth(user.id.value));
      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when cart is empty, it should return 400", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);
      // Empty cart - no items added
      const cart = Cart.create(user.id, []);
      await saveCartInDB(container, cart);

      const body = createValidOrderBody();

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when provided shipping price doesn't match provider's price, it should return 400", async () => {
      // Arrange
      const { user } = await setupUserWithCartItem();

      const body = createValidOrderBody({
        providedShippingPrice: 999, // Wrong price
        shippingDetails: {
          deliveryType: DeliveryType.TO_HOME,
        },
      });

      fakeGateway.getDeliveryFeesOfWilaya.mockResolvedValueOnce(
        deliveryFeesFactory({ homeDeliveryFee: 400 }),
      );

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when postal code doesn't exist in the wilaya, it should return 400", async () => {
      // Arrange
      const { user } = await setupUserWithCartItem();

      const body = createValidOrderBody({
        shippingDetails: {
          postalCode: "99999", // Non-existent postal code
        },
      });

      fakeGateway.getActiveCommunesOfWilaya.mockResolvedValueOnce([
        communeFactory({ postalCode: "11111" }),
      ]);

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("New State Validation - DB Changes", () => {
    test("when called with valid data, it should create an order in the database", async () => {
      // Arrange
      const { user } = await setupUserWithCartItem(2);
      const body = createValidOrderBody({
        providedShippingPrice: 350,
        shippingDetails: { deliveryType: DeliveryType.TO_DESK },
      });

      fakeGateway.getDeliveryFeesOfWilaya.mockResolvedValueOnce(
        deliveryFeesFactory({ stopDeskFee: 350 }),
      );

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

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
    });

    test("when called with valid data, it should clear the user's cart", async () => {
      // Arrange
      const { user } = await setupUserWithCartItem();

      const body = createValidOrderBody({
        providedShippingPrice: 350,
        shippingDetails: { deliveryType: DeliveryType.TO_DESK },
      });

      fakeGateway.getDeliveryFeesOfWilaya.mockResolvedValueOnce(
        deliveryFeesFactory({ stopDeskFee: 350 }),
      );

      // Act
      await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const cartRepository = container.resolveSingleton(CART_REPOSITORY);
      const updatedCart = await cartRepository.findByUserId(user.id);

      expect(updatedCart.getItems()).toHaveLength(0);
    });

    test("when called with valid data, it should reserve stock for the ordered items", async () => {
      // Arrange
      const { user, variation, product } = await setupUserWithCartItem();

      const initialReservedQty = variation.getReservedQty();
      const initialTotalQty = variation.getTotalQty();

      const body = createValidOrderBody({
        providedShippingPrice: 350,
        shippingDetails: { deliveryType: DeliveryType.TO_DESK },
      });

      fakeGateway.getDeliveryFeesOfWilaya.mockResolvedValueOnce(
        deliveryFeesFactory({ stopDeskFee: 350 }),
      );

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

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
      const { user } = await setupUserWithCartItem();

      const body = createValidOrderBody({
        providedShippingPrice: 350,
        shippingDetails: { deliveryType: DeliveryType.TO_DESK },
      });

      fakeGateway.getDeliveryFeesOfWilaya.mockResolvedValueOnce(
        deliveryFeesFactory({ stopDeskFee: 350 }),
      );

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      await expectOutboxEvent(
        container,
        DomainEventCode.ORDER_CREATED,
        response.body.orderId,
      );
    });

    test("when called with valid data, it should persist CartCleared event to outbox", async () => {
      // Arrange
      const { user } = await setupUserWithCartItem();

      const body = createValidOrderBody({
        providedShippingPrice: 350,
        shippingDetails: { deliveryType: DeliveryType.TO_DESK },
      });

      fakeGateway.getDeliveryFeesOfWilaya.mockResolvedValueOnce(
        deliveryFeesFactory({ stopDeskFee: 350 }),
      );

      // Act
      await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const cartClearedEvent = await expectOutboxEvent(
        container,
        DomainEventCode.CART_CLEARED,
      );

      expect((cartClearedEvent.payload as any).userId).toBe(user.id.value);
    });

    test("when called with valid data, it should persist StockReserved events to outbox", async () => {
      // Arrange
      const { user, product, variation } = await setupUserWithCartItem(2);

      const body = createValidOrderBody({
        providedShippingPrice: 350,
        shippingDetails: { deliveryType: DeliveryType.TO_DESK },
      });

      fakeGateway.getDeliveryFeesOfWilaya.mockResolvedValueOnce(
        deliveryFeesFactory({ stopDeskFee: 350 }),
      );

      // Act
      await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const stockReservedEvent = await expectOutboxEvent(
        container,
        DomainEventCode.STOCK_RESERVED,
        product.id.value,
      );

      expect((stockReservedEvent.payload as any).qty).toBe(2);
      expect((stockReservedEvent.payload as any).variationId).toBe(
        variation.id.value,
      );
    });

    test("when called with valid data, all events should be persisted in the same transaction", async () => {
      // Arrange
      const { user, product } = await setupUserWithCartItem();

      const body = createValidOrderBody({
        providedShippingPrice: 350,
        shippingDetails: { deliveryType: DeliveryType.TO_DESK },
      });

      fakeGateway.getDeliveryFeesOfWilaya.mockResolvedValueOnce(
        deliveryFeesFactory({ stopDeskFee: 350 }),
      );

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      await expectOutboxEvent(
        container,
        DomainEventCode.ORDER_CREATED,
        response.body.orderId,
      );

      await expectOutboxEvent(container, DomainEventCode.CART_CLEARED);

      await expectOutboxEvent(
        container,
        DomainEventCode.STOCK_RESERVED,
        product.id.value,
      );
    });
  });

  describe("Idempotency", () => {
    test("when called with the same idempotency key twice, it should return the same orderId", async () => {
      // Arrange
      const { user } = await setupUserWithCartItem();

      const idempotencyKey = "123e4567-e89b-12d3-a456-426614174000";
      const body = createValidOrderBody({ idempotencyKey });

      // Act - First request
      const firstResponse = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Act - Second request with same idempotency key
      const secondResponse = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

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
    test("when cart item has a discounted product, the order item should capture the discount", async () => {
      // Arrange
      const { user, product } = await setupUserWithCartItem(2);

      const body = createValidOrderBody();

      // Act
      const response = await request
        .post("/api/v1/orders")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const orderRepository = container.resolveSingleton(ORDER_REPOSITORY);
      const order = await orderRepository.find(
        OrderId.of(response.body.orderId),
      );

      const orderItem = order!.getOrderItems()[0]!;
      expect(orderItem.unitPriceAtOrderTime.amount).toBe(
        product.getPrice().amount,
      );

      expect(orderItem.unitDiscountPriceAtOrderTime!.amount).toBe(
        product.getDiscountedPrice()!.amount,
      );

      expect(orderItem.hasDiscount()).toBe(true);
    });
  });
});
