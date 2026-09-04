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
import { CartItemId } from "#/domain/value-objects/cart-item-id.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { CART_REPOSITORY } from "#/composition/utils/tokens.js";

describe("PATCH /api/v1/cart/items/:id", () => {
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
    test("when called with valid data, it should return 200 with success true", async () => {
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

      const cart = Cart.create(user.id, [
        CartItem.create(product.getVariations()[0]!.id, 1),
      ]);
      await saveCartInDB(container, cart);

      const itemId = cart.getItems()[0]!.id.value;

      // Act
      const response = await request
        .patch(`/api/v1/cart/items/${itemId}`)
        .send({ newQty: 5 })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with invalid newQty (0), it should return 400", async () => {
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
        .patch("/api/v1/cart/items/some-id")
        .send({ newQty: 0 })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with invalid newQty (negative), it should return 400", async () => {
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
        .patch("/api/v1/cart/items/some-id")
        .send({ newQty: -1 })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when item does not exist in cart, it should return 404", async () => {
      // Arrange
      const user = User.create(
        "name",
        "email@gmail.com",
        "CLIENT",
        null,
        true,
        false,
      );

      const itemId = CartItemId.generate();

      // Act
      const response = await request
        .patch(`/api/v1/cart/items/${itemId.value}`)
        .send({ newQty: 5 })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when user does not exist, it should return 404", async () => {
      // no user created in DB
      // Act
      const response = await request
        .patch("/api/v1/cart/items/some-id")
        .send({ newQty: 5 })
        .set(
          "authorization",
          `Bearer test-client-token ${UserId.generate().value}`,
        );

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should update the item quantity in the cart", async () => {
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

      const cart = Cart.create(user.id, [
        CartItem.create(product.getVariations()[0]!.id, 1),
      ]);
      await saveCartInDB(container, cart);

      const itemId = cart.getItems()[0]!.id;
      const newQty = 5;

      // Act
      await request
        .patch(`/api/v1/cart/items/${itemId.value}`)
        .send({ newQty })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const cartRepository = container.resolveSingleton(CART_REPOSITORY);
      const updatedCart = await cartRepository.findByUserId(user.id);

      const updatedItem = updatedCart!
        .getItems()
        .find((i) => i.id.equals(itemId));

      expect(updatedItem).toBeDefined();
      expect(updatedItem!.getQty()).toBe(newQty);
    });
  });
});
