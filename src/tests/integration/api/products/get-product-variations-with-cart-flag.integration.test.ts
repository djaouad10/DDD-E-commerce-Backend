import type { Container } from "#/composition/utils/container.js";
import { clearDatabase, createUserInDB } from "#/tests/helpers/db-helpers.js";
import { userFactory } from "#/tests/helpers/domain-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { clientAuth } from "#/tests/helpers/auth-helpers.js";
import {
  addExistingVariationToCart,
  setupProductAndUserInDB,
} from "#/tests/helpers/cart-helpers.js";

describe("GET /api/v1/products/:id/variations/with-cart-flag", () => {
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
    test("when product has variations and user has no cart items, it should return 200 with cartItemId undefined for all", async () => {
      // Arrange
      const { user, product } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .get(`/api/v1/products/${product.id.value}/variations/with-cart-flag`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      response.body.forEach((variation: any) => {
        expect(variation.cartItemId).toBeNull();
      });
    });

    test("when product has variations and user has some in cart, it should return 200 with cartItemId set for matching items", async () => {
      // Arrange
      const { user, product, variation1, variation2 } =
        await setupProductAndUserInDB(container);

      const item1 = await addExistingVariationToCart(container, {
        userId: user.id,
        variationId: variation1.id,
        qty: 1,
      });

      // Act
      const response = await request
        .get(`/api/v1/products/${product.id.value}/variations/with-cart-flag`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);

      const inCartVariation = response.body.find(
        (v: any) => v.id === variation1.id.value,
      );
      const notInCartVariation = response.body.find(
        (v: any) => v.id === variation2.id.value,
      );

      expect(inCartVariation.cartItemId).toBe(item1.id.value);
      expect(notInCartVariation.cartItemId).toBeNull();
    });

    test("when product does not exist, it should return 404", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      // Act
      const response = await request
        .get(
          `/api/v1/products/${ProductId.generate().value}/variations/with-cart-flag`,
        )
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when user does not exist, it should return 404", async () => {
      // Arrange
      const { product, user: _user1 } =
        await setupProductAndUserInDB(container);

      const user2 = userFactory();

      // Act — user not seeded
      const response = await request
        .get(`/api/v1/products/${product.id.value}/variations/with-cart-flag`)
        .set("authorization", clientAuth(user2.id.value));

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Data Correctness", () => {
    test("it should return variation data with correct shape", async () => {
      // Arrange
      const { user, product, variation1 } =
        await setupProductAndUserInDB(container);

      await addExistingVariationToCart(container, {
        userId: user.id,
        variationId: variation1.id,
        qty: 1,
      });

      // Act
      const response = await request
        .get(`/api/v1/products/${product.id.value}/variations/with-cart-flag`)
        .set("authorization", clientAuth(user.id.value));

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
