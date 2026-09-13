import type { Container } from "#/composition/utils/container.js";
import { clearDatabase, createRatingInDB } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { Rating } from "#/domain/entities/rating.js";
import { RATING_REPOSITORY } from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { adminAuth, clientAuth } from "#/tests/helpers/auth-helpers.js";
import { setupProductAndUserInDB } from "#/tests/helpers/cart-helpers.js";
import {
  expectOutboxEvent,
  expectOutboxEventCount,
} from "#/tests/helpers/outbox-assertions.js";

describe("DELETE /api/v1/ratings/product/:productId", () => {
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
    test("when client deletes own rating, it should return 200 with success true", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when admin deletes client's rating, it should return 200 with success true", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: user.id.value })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when client deletes non-existent rating, it should return 404", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when admin deletes non-existent rating, it should return 404", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: user.id.value })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      const response = await request.delete(
        `/api/v1/ratings/product/${product.id.value}`,
      );

      // Assert
      expect(response.status).toBe(401);
    });

    test("when admin does not provide clientId, it should return 400", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with invalid product id format, it should return 400", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .delete("/api/v1/ratings/product/invalid-id")
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("New State Validation", () => {
    test("when client deletes own rating, it should remove rating from DB", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const ratingRepository = container.resolveSingleton(RATING_REPOSITORY);
      const deletedRating = await ratingRepository.find(user.id, product.id);
      expect(deletedRating).toBeNull();
    });

    test("when client deletes own rating, it should persist RatingRejected event to outbox", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.RATING_REJECTED,
        `${user.id.value}_${product.id.value}`,
      );

      expect(event.payload).toMatchObject({
        aggregateId: `${user.id.value}_${product.id.value}`,
        userId: user.id.value,
        productId: product.id.value,
      });
    });

    test("when admin deletes client's rating, it should remove rating from DB", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: user.id.value })
        .set("authorization", adminAuth());

      // Assert
      const ratingRepository = container.resolveSingleton(RATING_REPOSITORY);
      const deletedRating = await ratingRepository.find(user.id, product.id);
      expect(deletedRating).toBeNull();
    });

    test("when admin deletes client's rating, it should persist RatingRejected event to outbox", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: user.id.value })
        .set("authorization", adminAuth());

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.RATING_REJECTED,
        `${user.id.value}_${product.id.value}`,
      );

      expect(event.payload).toMatchObject({
        aggregateId: `${user.id.value}_${product.id.value}`,
        userId: user.id.value,
        productId: product.id.value,
      });
    });

    test("when called with valid data, exactly one RatingRejected event should be persisted", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.RATING_REJECTED,
        1,
      );
    });
  });
});
