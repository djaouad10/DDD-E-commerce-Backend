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
import type { CartCleared } from "#/domain/events/cart/cart-cleared.js";

describe("DELETE /api/v1/cart/clear", () => {
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
    test("when called with populated cart, it should return 200 with success true", async () => {
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

      // Act
      const response = await request
        .delete("/api/v1/cart/clear")
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with empty cart, it should return 200 with success true", async () => {
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

      const cart = Cart.create(user.id, []);
      await saveCartInDB(container, cart);

      // Act
      const response = await request
        .delete("/api/v1/cart/clear")
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
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
        .delete("/api/v1/cart/clear")
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("New State Validation", () => {
    test("when called with populated cart, it should clear all items from the cart", async () => {
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

      // Act
      await request
        .delete("/api/v1/cart/clear")
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const cartRepository = container.resolveSingleton(CART_REPOSITORY);
      const updatedCart = await cartRepository.findByUserId(user.id);

      expect(updatedCart!.getItems()).toHaveLength(0);
    });

    test("when called with populated cart, it should persist CartCleared event to outbox", async () => {
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
      await request
        .delete("/api/v1/cart/clear")
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const cartClearedEvent = events.find(
        (e) => e.eventType === DomainEventCode.CART_CLEARED,
      );
      expect(cartClearedEvent).toBeDefined();
      expect((cartClearedEvent!.payload as CartCleared).userId).toBe(
        cart.userId.value,
      );
    });

    test("when called with empty cart, no CartCleared event should be emitted", async () => {
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

      const cart = Cart.create(user.id, []);
      await saveCartInDB(container, cart);

      // Act
      await request
        .delete("/api/v1/cart/clear")
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const cartClearedEvent = events.find(
        (e) => e.eventType === DomainEventCode.CART_CLEARED,
      );
      expect(cartClearedEvent).toBeUndefined();
    });
  });
});
