import type { Container } from "#/composition/utils/container.js";
import {
  clearDatabase,
  createCategoryInDB,
  createProductInDB,
  createUserInDB,
  saveCartInDB,
} from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { User } from "#/domain/entities/user.js";
import { Category } from "#/domain/entities/category.js";
import { productFactory } from "#/tests/helpers/domain-helpers.js";
import { Cart } from "#/domain/entities/cart.js";
import { CartItem } from "#/domain/entities/cart-item.js";
import {
  CART_REPOSITORY,
  OUTBOX_REPOSITORY,
} from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";

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
      const user = User.create(
        "name",
        "email@gmail.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);

      const variationId = product.getVariations()[0]!.id.value;

      // Act
      const response = await request
        .post("/api/v1/cart/items")
        .send({ variationId, qty: 3 })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

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
      const user = User.create(
        "name",
        "email@gmail.com",
        "CLIENT",
        null,
        true,
        false,
      );

      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);

      const existingCart = Cart.create(user.id, [
        CartItem.create(product.getVariations()[1]!.id, 1),
      ]);
      await saveCartInDB(container, existingCart);

      const newVariationId = product.getVariations()[0]!.id.value;

      // Act
      const response = await request
        .post("/api/v1/cart/items")
        .send({ variationId: newVariationId, qty: 2 })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: expect.any(String),
        variationId: newVariationId,
        qty: 2,
        updatedAt: expect.any(String),
      });
    });

    test("when called with qty 0, it should return 400", async () => {
      // Arrange
      const user = User.create(
        "name",
        "email@gmail.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      // Act
      const response = await request
        .post("/api/v1/cart/items")
        .send({ variationId: "some-id", qty: 0 })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with negative qty, it should return 400", async () => {
      // Arrange
      const user = User.create(
        "name",
        "email@gmail.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      // Act
      const response = await request
        .post("/api/v1/cart/items")
        .send({ variationId: "some-id", qty: -1 })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when variation already in cart, it should return 400", async () => {
      // Arrange
      const user = User.create(
        "name",
        "email@gmail.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);

      const variationId = product.getVariations()[0]!.id.value;

      const existingCart = Cart.create(user.id, [
        CartItem.create(product.getVariations()[0]!.id, 1),
      ]);
      await saveCartInDB(container, existingCart);

      // Act
      const response = await request
        .post("/api/v1/cart/items")
        .send({ variationId, qty: 2 })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when user does not exist, it should return 404", async () => {
      // Arrange
      const user = User.create(
        "name",
        "email@gmail.com",
        "CLIENT",
        null,
        true,
        false,
      );

      // Act
      const response = await request
        .post("/api/v1/cart/items")
        .send({ variationId: "some-id", qty: 1 })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should add the item to the cart", async () => {
      // Arrange
      const user = User.create(
        "name",
        "email@gmail.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);

      const variationId = product.getVariations()[0]!.id.value;
      const qty = 3;

      // Act
      await request
        .post("/api/v1/cart/items")
        .send({ variationId, qty })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

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
      const user = User.create(
        "name",
        "email@gmail.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);

      const variationId = product.getVariations()[0]!.id.value;
      const qty = 2;

      // Act
      await request
        .post("/api/v1/cart/items")
        .send({ variationId, qty })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const cartItemAddedEvent = events.find(
        (e) => e.eventType === DomainEventCode.CART_ITEM_ADDED,
      );
      expect(cartItemAddedEvent).toBeDefined();
      expect(cartItemAddedEvent!.aggregateId).toBeDefined();
      expect(cartItemAddedEvent!.payload).toMatchObject({
        userId: user.id.value,
        variationId,
        qty,
      });
    });

    test("when called with valid data on existing cart, it should append item to existing items", async () => {
      // Arrange
      const user = User.create(
        "name",
        "email@gmail.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);

      const existingVariationId = product.getVariations()[1]!.id.value;
      const existingCart = Cart.create(user.id, [
        CartItem.create(product.getVariations()[1]!.id, 1),
      ]);
      await saveCartInDB(container, existingCart);

      const newVariationId = product.getVariations()[0]!.id.value;
      const newQty = 2;

      // Act
      await request
        .post("/api/v1/cart/items")
        .send({ variationId: newVariationId, qty: newQty })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const cartRepository = container.resolveSingleton(CART_REPOSITORY);
      const updatedCart = await cartRepository.findByUserId(user.id);

      expect(updatedCart).not.toBeNull();
      expect(updatedCart!.getItems()).toHaveLength(2);
      expect(
        updatedCart!
          .getItems()
          .some((i) => i.variationId.value === existingVariationId),
      ).toBe(true);
      expect(
        updatedCart!
          .getItems()
          .some((i) => i.variationId.value === newVariationId),
      ).toBe(true);
    });
  });
});
