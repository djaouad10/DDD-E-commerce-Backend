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
import { ProductId } from "#/domain/value-objects/product-id.js";
import {
  RATING_REPOSITORY,
  OUTBOX_REPOSITORY,
} from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import type { RatingSubmitted } from "#/domain/events/rating/rating-submitted.js";

describe("POST /api/v1/ratings/product/:productId", () => {
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
    test("when called with valid data, it should return 200 with success true", async () => {
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
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 4, comment: "Great product!" })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with null comment, it should return 200 with success true", async () => {
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
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 5, comment: null })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with rating 0, it should return 200", async () => {
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
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 0, comment: "Terrible" })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with rating 5, it should return 200", async () => {
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
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 5, comment: "Perfect" })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when user already rated the product, it should return 409", async () => {
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
      const existingRating = Rating.create(user.id, product.id, 3, "Okay");
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);
      await createRatingInDB(container, existingRating);

      // Act
      const response = await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 4, comment: "Better" })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(409);
    });

    test("when product does not exist, it should return 404", async () => {
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
        .post(`/api/v1/ratings/product/${ProductId.generate().value}`)
        .send({ rating: 4, comment: "Good" })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when user does not exist, it should return 404", async () => {
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
      // user intentionally not created

      // Act
      const response = await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 4, comment: "Good" })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when called with rating > 5, it should return 400", async () => {
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
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 6, comment: "Too good" })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with negative rating, it should return 400", async () => {
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
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: -1, comment: "Bad" })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with missing rating, it should return 400", async () => {
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
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ comment: "Missing rating" })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with missing comment, it should return 400", async () => {
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
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 4 })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 4, comment: "Good" });

      // Assert
      expect(response.status).toBe(401);
    });

    test("when admin token is used, it should return 403", async () => {
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
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 4, comment: "Good" })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(403);
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should persist rating to DB", async () => {
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

      const ratingValue = 4;
      const comment = "Excellent!";

      // Act
      await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: ratingValue, comment })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

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

      const ratingValue = 5;
      const comment = "Love it";

      // Act
      await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: ratingValue, comment })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const ratingSubmittedEvent = events.find(
        (e) => e.eventType === DomainEventCode.RATING_SUBMITTED,
      );
      expect(ratingSubmittedEvent).toBeDefined();
      expect(ratingSubmittedEvent!.aggregateId).toBe(
        `${user.id.value}_${product.id.value}`,
      );
      expect((ratingSubmittedEvent!.payload as RatingSubmitted).userId).toBe(
        user.id.value,
      );
      expect((ratingSubmittedEvent!.payload as RatingSubmitted).productId).toBe(
        product.id.value,
      );
      expect((ratingSubmittedEvent!.payload as RatingSubmitted).rating).toBe(
        ratingValue,
      );
      expect((ratingSubmittedEvent!.payload as RatingSubmitted).comment).toBe(
        comment,
      );
    });

    test("when called with null comment, comment should be null in DB", async () => {
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
      await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 3, comment: null })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const ratingRepository = container.resolveSingleton(RATING_REPOSITORY);
      const savedRating = await ratingRepository.find(user.id, product.id);

      expect(savedRating).not.toBeNull();
      expect(savedRating!.getComment()).toBeNull();
    });

    test("when called with valid data, exactly one RatingSubmitted event should be persisted", async () => {
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
      await request
        .post(`/api/v1/ratings/product/${product.id.value}`)
        .send({ rating: 4, comment: "Nice" })
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const ratingSubmittedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.RATING_SUBMITTED,
      );
      expect(ratingSubmittedEvents).toHaveLength(1);
    });
  });
});
