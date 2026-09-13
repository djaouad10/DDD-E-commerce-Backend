import type { Container } from "#/composition/utils/container.js";
import { clearDatabase } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { CART_REPOSITORY } from "#/composition/utils/tokens.js";
import { CartItemId } from "#/domain/value-objects/cart-item-id.js";
import { clientAuth } from "#/tests/helpers/auth-helpers.js";
import {
  addExistingVariationToCart,
  setupProductAndUserInDB,
} from "#/tests/helpers/cart-helpers.js";
import { userFactory } from "#/tests/helpers/domain-helpers.js";

describe("DELETE /api/v1/cart/items/:id", () => {
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
    test("when called with valid item id, it should return 200 with success true", async () => {
      // Arrange
      const { user, variation1 } = await setupProductAndUserInDB(container);

      const item = await addExistingVariationToCart(container, {
        userId: user.id,
        variationId: variation1.id,
        qty: 1,
      });

      // Act
      const response = await request
        .delete(`/api/v1/cart/items/${item.id.value}`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when item does not exist in cart, it should return 404", async () => {
      // Arrange
      const { user, variation1 } = await setupProductAndUserInDB(container);

      await addExistingVariationToCart(container, {
        userId: user.id,
        variationId: variation1.id,
        qty: 1,
      });

      // Act
      const response = await request
        .delete(`/api/v1/cart/items/${CartItemId.generate().value}`)
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
        .delete("/api/v1/cart/items/some-id")
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("New State Validation", () => {
    test("when called with valid item id, it should remove the item from the cart", async () => {
      // Arrange
      const { user, variation1, variation2 } =
        await setupProductAndUserInDB(container);

      const item1 = await addExistingVariationToCart(container, {
        userId: user.id,
        variationId: variation1.id,
        qty: 1,
      });

      const item2 = await addExistingVariationToCart(container, {
        userId: user.id,
        variationId: variation2.id,
        qty: 1,
      });

      const itemIdToRemove = item1.id.value;
      const remainingItemId = item2.id.value;

      // Act
      await request
        .delete(`/api/v1/cart/items/${itemIdToRemove}`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const cartRepository = container.resolveSingleton(CART_REPOSITORY);
      const updatedCart = await cartRepository.findByUserId(user.id);

      expect(updatedCart).not.toBeNull();
      expect(updatedCart!.getItems()).toHaveLength(1);
      expect(updatedCart!.getItems()[0]!.id.value).toBe(remainingItemId);
    });

    test("when removing last item, cart should be empty", async () => {
      // Arrange
      const { user, variation1 } = await setupProductAndUserInDB(container);

      const item = await addExistingVariationToCart(container, {
        userId: user.id,
        variationId: variation1.id,
        qty: 1,
      });

      // Act
      await request
        .delete(`/api/v1/cart/items/${item.id.value}`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const cartRepository = container.resolveSingleton(CART_REPOSITORY);
      const updatedCart = await cartRepository.findByUserId(user.id);

      expect(updatedCart).not.toBeNull();
      expect(updatedCart!.getItems()).toHaveLength(0);
    });
  });
});
