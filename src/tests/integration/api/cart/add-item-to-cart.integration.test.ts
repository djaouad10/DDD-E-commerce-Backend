import type { Container } from "#/composition/utils/container.js";
import { clearDatabase } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { userFactory } from "#/tests/helpers/domain-helpers.js";
import { CART_REPOSITORY } from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { clientAuth } from "#/tests/helpers/auth-helpers.js";
import { expectOutboxEvent } from "#/tests/helpers/outbox-assertions.js";
import { addExistingVariationToCart, setupProductAndUserInDB } from "#/tests/helpers/cart-helpers.js";

describe("POST /api/v1/cart/items", () => {
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

  describe("Response Validation", () => {
    test("when called with valid data and new cart, it should return 200 with created cart item", async () => {
      // Arrange
      const { user, variation1 } = await setupProductAndUserInDB(container);
      const variationId = variation1.id.value;

      // Act
      const response = await request
        .post("/api/v1/cart/items")
        .send({ variationId, qty: 3 })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: expect.any(String),
        variationId,
        qty: 3,
        updatedAt: expect.any(String),
      });
    });

    test("when called with valid data and existing cart, it should return 200 with created cart item", async () => {
      // Arrange
      const { user, variation1, variation2 } = await setupProductAndUserInDB(container);

      await addExistingVariationToCart(container, {
        userId: user.id,
        variationId: variation1.id,
        qty: 1,
      });

      // Act
      const response = await request
        .post("/api/v1/cart/items")
        .send({ variationId: variation2.id.value, qty: 2 })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: expect.any(String),
        variationId: variation2.id.value,
        qty: 2,
        updatedAt: expect.any(String),
      });
    });

    test("when called with qty 0, it should return 400", async () => {
      // Arrange
      const { user, variation1 } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .post("/api/v1/cart/items")
        .send({ variationId: variation1.id.value, qty: 0 })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with negative qty, it should return 400", async () => {
      // Arrange
      const { user, variation1 } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .post("/api/v1/cart/items")
        .send({ variationId: variation1.id.value, qty: -1 })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when variation already in cart, it should return 400", async () => {
      // Arrange
      const { user, variation1 } = await setupProductAndUserInDB(container);

      await addExistingVariationToCart(container, {
        userId: user.id,
        variationId: variation1.id,
        qty: 1,
      });

      // Act
      const response = await request
        .post("/api/v1/cart/items")
        .send({ variationId: variation1.id.value, qty: 2 })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when user does not exist, it should return 404", async () => {
      // Arrange
      const user = userFactory(); // User not saved in DB

      // Act
      const response = await request
        .post("/api/v1/cart/items")
        .send({ variationId: "some-id", qty: 1 })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should add the item to the cart", async () => {
      // Arrange
      const { user, variation1 } = await setupProductAndUserInDB(container);
      const variationId = variation1.id.value;
      const qty = 3;

      // Act
      await request
        .post("/api/v1/cart/items")
        .send({ variationId, qty })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const cartRepository = container.resolveSingleton(CART_REPOSITORY);
      const updatedCart = await cartRepository.findByUserId(user.id);

      expect(updatedCart).not.toBeNull();
      expect(updatedCart!.getItems()).toHaveLength(1);
      expect(updatedCart!.getItems()[0]!.variationId.value).toBe(variationId);
      expect(updatedCart!.getItems()[0]!.getQty()).toBe(qty);
    });

    test("when called with valid data, it should persist CartItemAdded event to outbox", async () => {
      // Arrange
      const { user, variation1 } = await setupProductAndUserInDB(container);
      const variationId = variation1.id.value;
      const qty = 3;

      // Act
      await request
        .post("/api/v1/cart/items")
        .send({ variationId, qty })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.CART_ITEM_ADDED,
      );

      expect(event.payload as any).toMatchObject({
        userId: user.id.value,
        variationId,
        qty,
      });
    });

    test("when called with valid data on existing cart, it should append item to existing items", async () => {
      // Arrange
      const { user, variation1, variation2 } = await setupProductAndUserInDB(container);

      await addExistingVariationToCart(container, {
        userId: user.id,
        variationId: variation1.id,
        qty: 1,
      });

      // Act
      await request
        .post("/api/v1/cart/items")
        .send({ variationId: variation2.id.value, qty: 1 })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const cartRepository = container.resolveSingleton(CART_REPOSITORY);
      const updatedCart = await cartRepository.findByUserId(user.id);

      const cartItemVarIds = updatedCart!
        .getItems()
        .map((it) => it.variationId.value);

      expect(updatedCart).not.toBeNull();
      expect(updatedCart!.getItems()).toHaveLength(2);
      expect(cartItemVarIds).toContain(variation1.id.value);
      expect(cartItemVarIds).toContain(variation2.id.value);
    });
  });
});
