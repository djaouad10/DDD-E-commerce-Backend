import type { Container } from "#/composition/utils/container.js";
import { clearDatabase } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { CART_REPOSITORY } from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { clientAuth } from "#/tests/helpers/auth-helpers.js";
import {
  addExistingVariationToCart,
  setupProductAndUserInDB,
} from "#/tests/helpers/cart-helpers.js";
import {
  expectNoOutboxEvent,
  expectOutboxEvent,
} from "#/tests/helpers/outbox-assertions.js";
import { userFactory } from "#/tests/helpers/domain-helpers.js";

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
      const { user, variation1, variation2 } =
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
        .delete("/api/v1/cart/clear")
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with empty cart, it should return 200 with success true", async () => {
      // Arrange
      const { user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .delete("/api/v1/cart/clear")
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when user does not exist, it should return 404", async () => {
      // Arrange
      const user = userFactory(); // User not saved in DB

      // Act — user not seeded in DB
      const response = await request
        .delete("/api/v1/cart/clear")
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("New State Validation", () => {
    test("when called with populated cart, it should clear all items from the cart", async () => {
      // Arrange
      const { user, variation1, variation2 } =
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
      await request
        .delete("/api/v1/cart/clear")
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const cartRepository = container.resolveSingleton(CART_REPOSITORY);
      const updatedCart = await cartRepository.findByUserId(user.id);

      expect(updatedCart!.getItems()).toHaveLength(0);
    });

    test("when called with populated cart, it should persist CartCleared event to outbox", async () => {
      // Arrange
      const { user, variation1 } = await setupProductAndUserInDB(container);

      await addExistingVariationToCart(container, {
        userId: user.id,
        variationId: variation1.id,
        qty: 1,
      });

      // Act
      await request
        .delete("/api/v1/cart/clear")
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.CART_CLEARED,
      );

      expect((event.payload as any).userId).toBe(user.id.value);
    });

    test("when called with empty cart, no CartCleared event should be emitted", async () => {
      // Arrange
      const { user } = await setupProductAndUserInDB(container);

      // Act
      await request
        .delete("/api/v1/cart/clear")
        .set("authorization", clientAuth(user.id.value));

      // Assert
      await expectNoOutboxEvent(container, DomainEventCode.CART_CLEARED);
    });
  });
});
