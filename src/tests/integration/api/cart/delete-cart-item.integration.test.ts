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
import { CART_REPOSITORY } from "#/composition/utils/tokens.js";
import { CartItemId } from "#/domain/value-objects/cart-item-id.js";

describe("DELETE /api/v1/cart/items/:id", () => {
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
    test("when called with valid item id, it should return 200 with success true", async () => {
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
        .delete(`/api/v1/cart/items/${itemId}`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
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
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);

      const cart = Cart.create(user.id, [
        CartItem.create(product.getVariations()[0]!.id, 1),
      ]);
      await saveCartInDB(container, cart);

      // Act
      const response = await request
        .delete(`/api/v1/cart/items/${CartItemId.generate().value}`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
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

      // Act — user not seeded in DB
      const response = await request
        .delete("/api/v1/cart/items/some-id")
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("New State Validation", () => {
    test("when called with valid item id, it should remove the item from the cart", async () => {
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
        CartItem.create(product.getVariations()[1]!.id, 2),
      ]);
      await saveCartInDB(container, cart);

      const itemIdToRemove = cart.getItems()[0]!.id.value;
      const remainingItemId = cart.getItems()[1]!.id.value;

      // Act
      await request
        .delete(`/api/v1/cart/items/${itemIdToRemove}`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const cartRepository = container.resolveSingleton(CART_REPOSITORY);
      const updatedCart = await cartRepository.findByUserId(user.id);

      expect(updatedCart).not.toBeNull();
      expect(updatedCart!.getItems()).toHaveLength(1);
      expect(updatedCart!.getItems()[0]!.id.value).toBe(remainingItemId);
    });

    test("when removing last item, cart should be empty", async () => {
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
      await request
        .delete(`/api/v1/cart/items/${itemId}`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const cartRepository = container.resolveSingleton(CART_REPOSITORY);
      const updatedCart = await cartRepository.findByUserId(user.id);

      expect(updatedCart).not.toBeNull();
      expect(updatedCart!.getItems()).toHaveLength(0);
    });
  });
});
