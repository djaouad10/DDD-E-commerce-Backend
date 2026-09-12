import type { Container } from "#/composition/utils/container.js";
import { clearDatabase } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";

import { UserId } from "#/domain/value-objects/user-id.js";
import { clientAuth } from "#/tests/helpers/auth-helpers.js";
import {
  addExistingVariationToCart,
  setupProductAndUserInDB,
} from "#/tests/helpers/cart-helpers.js";

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
      const { user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .get("/api/v1/cart")
        .set("authorization", clientAuth(user.id.value));

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
      const { user, category, variation1, variation2 } =
        await setupProductAndUserInDB(container);

      await addExistingVariationToCart(container, {
        userId: user.id,
        variationId: variation1.id,
        qty: 1,
      });

      await addExistingVariationToCart(container, {
        userId: user.id,
        variationId: variation2.id,
        qty: 1,
      });

      // Act
      const response = await request
        .get("/api/v1/cart")
        .set("authorization", clientAuth(user.id.value));

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
        .set("authorization", clientAuth(UserId.generate().value));

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });
});
