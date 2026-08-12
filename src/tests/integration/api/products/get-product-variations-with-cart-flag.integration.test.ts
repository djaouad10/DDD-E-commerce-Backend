import type { Container } from "#/composition/container.js";
import { Category } from "#/domain/entities/category.js";
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
import { Cart } from "#/domain/entities/cart.js";
import { CartItem } from "#/domain/entities/cart-item.js";
import { ProductId } from "#/domain/value-objects/product-id.js";

describe("GET /api/v1/products/:id/variations/with-cart-flag", () => {
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
    test("when product has variations and user has no cart items, it should return 200 with cartItemId undefined for all", async () => {
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

      // Act
      const response = await request
        .get(`/api/v1/products/${product.id.value}/variations/with-cart-flag`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      response.body.forEach((variation: any) => {
        expect(variation.cartItemId).toBeNull();
      });
    });

    test("when product has variations and user has some in cart, it should return 200 with cartItemId set for matching items", async () => {
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

      const variationInCart = product.getVariations()[0]!;
      const variationNotInCart = product.getVariations()[1]!;

      const cart = Cart.create(user.id, [
        CartItem.create(variationInCart.id, 2),
      ]);
      await saveCartInDB(container, cart);

      const cartItemId = cart.getItems()[0]!.id.value;

      // Act
      const response = await request
        .get(`/api/v1/products/${product.id.value}/variations/with-cart-flag`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);

      const inCartVariation = response.body.find(
        (v: any) => v.id === variationInCart.id.value,
      );
      const notInCartVariation = response.body.find(
        (v: any) => v.id === variationNotInCart.id.value,
      );

      expect(inCartVariation.cartItemId).toBe(cartItemId);
      expect(notInCartVariation.cartItemId).toBeNull();
    });

    test("when product does not exist, it should return 404", async () => {
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
        .get(
          `/api/v1/products/${ProductId.generate().value}/variations/with-cart-flag`,
        )
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when user does not exist, it should return 404", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const user = User.create(
        "name",
        "email@gmail.com",
        "CLIENT",
        null,
        true,
        false,
      );

      // Act — user not seeded
      const response = await request
        .get(`/api/v1/products/${product.id.value}/variations/with-cart-flag`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Data Correctness", () => {
    test("it should return variation data with correct shape", async () => {
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

      // Act
      const response = await request
        .get(`/api/v1/products/${product.id.value}/variations/with-cart-flag`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body[0]).toEqual(
        expect.objectContaining({
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
          cartItemId: expect.toSatisfy(
            (value) => value === null || typeof value === "string",
          ),
        }),
      );
    });
  });
});
