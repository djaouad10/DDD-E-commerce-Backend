import type { Container } from "#/composition/utils/container.js";
import {
  clearDatabase,
  createCategoryInDB,
  createProductInDB,
  createUserInDB,
  createRatingInDB,
} from "#/tests/helpers/db-helpers.js";
import { productFactory } from "#/tests/helpers/domain-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { Category } from "#/domain/entities/category.js";
import { User } from "#/domain/entities/user.js";
import { Rating } from "#/domain/entities/rating.js";
import {
  RATING_REPOSITORY,
  OUTBOX_REPOSITORY,
} from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import type { RatingRejected } from "#/domain/events/rating/rating-rejected.js";

describe("DELETE /api/v1/ratings/product/:productId", () => {
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
    test("when client deletes own rating, it should return 200 with success true", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating = Rating.create(user.id, product.id, 4, "Good");
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);
      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when admin deletes client's rating, it should return 200 with success true", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating = Rating.create(user.id, product.id, 4, "Good");
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);
      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: user.id.value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when client deletes non-existent rating, it should return 404", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);

      // Act
      const response = await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when admin deletes non-existent rating, it should return 404", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);

      // Act
      const response = await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: user.id.value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request.delete(
        `/api/v1/ratings/product/${product.id.value}`,
      );

      // Assert
      expect(response.status).toBe(401);
    });

    test("when admin does not provide clientId, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating = Rating.create(user.id, product.id, 4, "Good");
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);
      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with invalid product id format, it should return 400", async () => {
      // Arrange
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      // Act
      const response = await request
        .delete("/api/v1/ratings/product/invalid-id")
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("New State Validation", () => {
    test("when client deletes own rating, it should remove rating from DB", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating = Rating.create(user.id, product.id, 4, "Good");
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);
      await createRatingInDB(container, rating);

      // Act
      await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const ratingRepository = container.resolveSingleton(RATING_REPOSITORY);
      const deletedRating = await ratingRepository.find(user.id, product.id);
      expect(deletedRating).toBeNull();
    });

    test("when client deletes own rating, it should persist RatingRejected event to outbox", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating = Rating.create(user.id, product.id, 4, "Good");
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);
      await createRatingInDB(container, rating);

      // Act
      await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const ratingRejectedEvent = events.find(
        (e) => e.eventType === DomainEventCode.RATING_REJECTED,
      );
      expect(ratingRejectedEvent).toBeDefined();
      expect(ratingRejectedEvent!.aggregateId).toBe(
        `${user.id.value}_${product.id.value}`,
      );
      expect((ratingRejectedEvent!.payload as RatingRejected).userId).toBe(
        user.id.value,
      );
      expect((ratingRejectedEvent!.payload as RatingRejected).productId).toBe(
        product.id.value,
      );
    });

    test("when admin deletes client's rating, it should remove rating from DB", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating = Rating.create(user.id, product.id, 4, "Good");
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);
      await createRatingInDB(container, rating);

      // Act
      await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: user.id.value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const ratingRepository = container.resolveSingleton(RATING_REPOSITORY);
      const deletedRating = await ratingRepository.find(user.id, product.id);
      expect(deletedRating).toBeNull();
    });

    test("when admin deletes client's rating, it should persist RatingRejected event to outbox", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating = Rating.create(user.id, product.id, 4, "Good");
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);
      await createRatingInDB(container, rating);

      // Act
      await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: user.id.value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const ratingRejectedEvent = events.find(
        (e) => e.eventType === DomainEventCode.RATING_REJECTED,
      );
      expect(ratingRejectedEvent).toBeDefined();
      expect(ratingRejectedEvent!.aggregateId).toBe(
        `${user.id.value}_${product.id.value}`,
      );
    });

    test("when called with valid data, exactly one RatingRejected event should be persisted", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating = Rating.create(user.id, product.id, 4, "Good");
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);
      await createRatingInDB(container, rating);

      // Act
      await request
        .delete(`/api/v1/ratings/product/${product.id.value}`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const ratingRejectedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.RATING_REJECTED,
      );
      expect(ratingRejectedEvents).toHaveLength(1);
    });
  });
});
