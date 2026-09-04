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
import { UserId } from "#/domain/value-objects/user-id.js";

describe("GET /api/v1/cart", () => {
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
    test("when called with empty cart, it should return a cart object with empty items array and status 200", async () => {
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
        .get("/api/v1/cart")
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        userId: user.id.value,
        items: [],
        updatedAt: expect.any(String),
      });
    });

    test("when called with populated cart, it should return a cart object with items array and status 200", async () => {
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
        CartItem.create(product.getVariations()[1]!.id, 3),
      ]);

      await saveCartInDB(container, cart);

      // Act
      const response = await request
        .get("/api/v1/cart")
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        userId: user.id.value,
        updatedAt: expect.any(String),
        items: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            qty: expect.any(Number),
            variation: expect.objectContaining({
              size: expect.any(String),
              color: expect.any(String),
              availableQty: expect.any(Number),
            }),
            product: expect.objectContaining({
              name: expect.any(String),
              category: expect.objectContaining({
                id: category.id.value,
              }),
            }),
          }),
        ]),
      });
      expect(response.body.items).toHaveLength(2);
    });

    test("when called with a non existent user, it should return a 404 status", async () => {
      // Act
      const response = await request
        .get("/api/v1/cart")
        .set(
          "authorization",
          `Bearer test-client-token ${UserId.generate().value}`,
        );

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });
});
