import type { Container } from "#/composition/utils/container.js";
import { clearDatabase, createRatingInDB } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { Rating } from "#/domain/entities/rating.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { RATING_REPOSITORY } from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { adminAuth, clientAuth } from "#/tests/helpers/auth-helpers.js";
import { setupProductAndUserInDB } from "#/tests/helpers/cart-helpers.js";
import {
  expectNoOutboxEvent,
  expectOutboxEvent,
  expectOutboxEventCount,
} from "#/tests/helpers/outbox-assertions.js";

describe("PATCH /api/v1/ratings/product/:productId", () => {
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
    test("when admin approves pending rating, it should return 200 with success true", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: user.id.value })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when admin approves already approved rating, it should return 200 (idempotent)", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");
      rating.approve();

      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: user.id.value })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when rating does not exist, it should return 404", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: user.id.value })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when product does not exist, it should return 404", async () => {
      // Arrange
      const { user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .patch(`/api/v1/ratings/product/${ProductId.generate().value}`)
        .send({ clientId: user.id.value })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when called with invalid product id format, it should return 400", async () => {
      // Arrange
      const { user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .patch("/api/v1/ratings/product/invalid-id")
        .send({ clientId: user.id.value })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called without clientId, it should return 400", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({})
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: user.id.value });

      // Assert
      expect(response.status).toBe(401);
    });

    test("when client token is used, it should return 403", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: user.id.value })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(403);
    });
  });

  describe("New State Validation", () => {
    test("when admin approves pending rating, it should set isApproved to true in DB", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: user.id.value })
        .set("authorization", adminAuth());

      // Assert
      const ratingRepository = container.resolveSingleton(RATING_REPOSITORY);
      const updatedRating = await ratingRepository.find(user.id, product.id);

      expect(updatedRating).not.toBeNull();
      expect(updatedRating!.isApproved()).toBe(true);
    });

    test("when admin approves pending rating, it should persist RatingApproved event to outbox", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: user.id.value })
        .set("authorization", adminAuth());

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.RATING_APPROVED,
        `${rating.userId.value}_${rating.productId.value}`,
      );

      expect(event.payload).toMatchObject({
        aggregateId: `${rating.userId.value}_${rating.productId.value}`,
        userId: rating.userId.value,
        productId: rating.productId.value,
        rating: rating.getRating(),
      });
    });

    test("when admin approves already approved rating, no additional RatingApproved event should be emitted", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");
      rating.approve();

      await createRatingInDB(container, rating);

      // Act
      await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: user.id.value })
        .set("authorization", adminAuth());

      // Assert
      await expectNoOutboxEvent(container, DomainEventCode.RATING_APPROVED);
    });

    test("when admin approves pending rating, exactly one RatingApproved event should be persisted", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: user.id.value })
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.RATING_APPROVED,
        1,
      );
    });
  });
});
