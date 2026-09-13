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
import { UserId } from "#/domain/value-objects/user-id.js";
import {
  expectOutboxEvent,
  expectOutboxEventCount,
} from "#/tests/helpers/outbox-assertions.js";

describe("POST /api/v1/ratings/product/:productId", () => {
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
      const { product, user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 4, comment: "Great product!" })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with null comment, it should return 200 with success true", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 5, comment: null })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with rating 0, it should return 200", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 0, comment: "Terrible" })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with rating 5, it should return 200", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 5, comment: "Perfect" })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when user already rated the product, it should return 409", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 4, comment: "Better" })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(409);
    });

    test("when product does not exist, it should return 404", async () => {
      // Arrange
      const { user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .post(`/api/v1/ratings/product/${ProductId.generate().value}`)
        .send({ rating: 4, comment: "Good" })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when user does not exist, it should return 404", async () => {
      // Arrange
      const { product } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 4, comment: "Good" })
        .set("authorization", clientAuth(UserId.generate().value));

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test.each([
      ["rating > 5", { rating: 6, comment: "Too good" }],
      ["negative rating", { rating: -1, comment: "Bad" }],
      ["missing comment", { rating: 4 }],
      ["missing rating", { comment: "Good" }],
    ])("when called with %s, it should return 400", async (_, body) => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const { product } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 4, comment: "Good" });

      // Assert
      expect(response.status).toBe(401);
    });

    test("when admin token is used, it should return 403", async () => {
      // Arrange
      const { product } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 4, comment: "Good" })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(403);
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should persist rating to DB", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const ratingValue = 4;
      const comment = "Excellent!";

      // Act
      await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: ratingValue, comment })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const ratingRepository = container.resolveSingleton(RATING_REPOSITORY);
      const savedRating = await ratingRepository.find(user.id, product.id);

      expect(savedRating).not.toBeNull();
      expect(savedRating!.getRating()).toBe(ratingValue);
      expect(savedRating!.getComment()).toBe(comment);
      expect(savedRating!.isApproved()).toBe(false);
      expect(savedRating!.userId.value).toBe(user.id.value);
      expect(savedRating!.productId.value).toBe(product.id.value);
    });

    test("when called with valid data, it should persist RatingSubmitted event to outbox", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const ratingValue = 5;
      const comment = "Love it";

      // Act
      await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: ratingValue, comment })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.RATING_SUBMITTED,
        `${user.id.value}_${product.id.value}`,
      );

      expect(event.payload).toMatchObject({
        aggregateId: `${user.id.value}_${product.id.value}`,
        userId: user.id.value,
        productId: product.id.value,
        rating: ratingValue,
        comment: comment,
      });
    });

    test("when called with null comment, comment should be null in DB", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      // Act
      await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 3, comment: null })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const ratingRepository = container.resolveSingleton(RATING_REPOSITORY);
      const savedRating = await ratingRepository.find(user.id, product.id);

      expect(savedRating).not.toBeNull();
      expect(savedRating!.getComment()).toBeNull();
    });

    test("when called with valid data, exactly one RatingSubmitted event should be persisted", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      // Act
      await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 4, comment: "Nice" })
        .set("authorization", clientAuth(user.id.value));

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.RATING_SUBMITTED,
        1,
      );
    });
  });
});
