import type { Container } from "#/composition/utils/container.js";
import { clearDatabase } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { userFactory } from "#/tests/helpers/domain-helpers.js";
import { CartItemId } from "#/domain/value-objects/cart-item-id.js";
import { CART_REPOSITORY } from "#/composition/utils/tokens.js";
import { clientAuth } from "#/tests/helpers/auth-helpers.js";
import {
  addExistingVariationToCart,
  setupProductAndUserInDB,
} from "#/tests/helpers/cart-helpers.js";

describe("PATCH /api/v1/cart/items/:id", () => {
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
    test("when called with valid data, it should return 200 with success true", async () => {
      // Arrange
      const { user, variation1 } = await setupProductAndUserInDB(container);

      const item = await addExistingVariationToCart(container, {
        userId: user.id,
        variationId: variation1.id,
        qty: 1,
      });

      // Act
      const response = await request
        .patch(`/api/v1/cart/items/${item.id.value}`)
        .send({ newQty: 5 })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with invalid newQty (0), it should return 400", async () => {
      // Arrange
      const { user, variation1 } = await setupProductAndUserInDB(container);

      const item = await addExistingVariationToCart(container, {
        userId: user.id,
        variationId: variation1.id,
        qty: 1,
      });

      // Act
      const response = await request
        .patch(`/api/v1/cart/items/${item.id.value}`)
        .send({ newQty: 0 })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with invalid newQty (negative), it should return 400", async () => {
      // Arrange
      const { user, variation1 } = await setupProductAndUserInDB(container);

      const item = await addExistingVariationToCart(container, {
        userId: user.id,
        variationId: variation1.id,
        qty: 1,
      });

      // Act
      const response = await request
        .patch(`/api/v1/cart/items/${item.id.value}`)
        .send({ newQty: -1 })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when item does not exist in cart, it should return 404", async () => {
      // Arrange
      const { user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .patch(`/api/v1/cart/items/${CartItemId.generate().value}`)
        .send({ newQty: 5 })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when user does not exist, it should return 404", async () => {
      // Arrange
      const user = userFactory(); // User not saved in DB

      // Act
      const response = await request
        .patch("/api/v1/cart/items/some-id")
        .send({ newQty: 5 })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should update the item quantity in the cart", async () => {
      // Arrange
      const { user, variation1 } = await setupProductAndUserInDB(container);

      const item = await addExistingVariationToCart(container, {
        userId: user.id,
        variationId: variation1.id,
        qty: 1,
      });

      const itemId = item.id;
      const newQty = 5;

      // Act
      await request
        .patch(`/api/v1/cart/items/${itemId.value}`)
        .send({ newQty })
        .set("authorization", clientAuth(user.id.value));

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
