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
import type { RatingApproved } from "#/domain/events/rating/rating-approved.js";

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
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const client = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating = Rating.create(client.id, product.id, 4, "Good product");
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, client);
      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: client.id.value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when admin approves already approved rating, it should return 200 (idempotent)", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const client = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating = Rating.create(client.id, product.id, 5, "Great!");
      rating.approve();
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, client);
      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: client.id.value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when rating does not exist, it should return 404", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const client = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, client);

      // Act
      const response = await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: client.id.value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when product does not exist, it should return 404", async () => {
      // Arrange
      const client = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, client);

      // Act
      const response = await request
        .patch(`/api/v1/ratings/product/${ProductId.generate().value}`)
        .send({ clientId: client.id.value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when called with invalid product id format, it should return 400", async () => {
      // Arrange
      const client = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, client);

      // Act
      const response = await request
        .patch("/api/v1/ratings/product/invalid-id")
        .send({ clientId: client.id.value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called without clientId, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({})
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const client = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating = Rating.create(client.id, product.id, 4, "Good");
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, client);
      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: client.id.value });

      // Assert
      expect(response.status).toBe(401);
    });

    test("when client token is used, it should return 403", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const client = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating = Rating.create(client.id, product.id, 4, "Good");
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, client);
      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: client.id.value })
        .set("authorization", `Bearer test-client-token ${client.id.value}`);

      // Assert
      expect(response.status).toBe(403);
    });
  });

  describe("New State Validation", () => {
    test("when admin approves pending rating, it should set isApproved to true in DB", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const client = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating = Rating.create(client.id, product.id, 4, "Good product");
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, client);
      await createRatingInDB(container, rating);

      // Act
      await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: client.id.value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const ratingRepository = container.resolveSingleton(RATING_REPOSITORY);
      const updatedRating = await ratingRepository.find(client.id, product.id);

      expect(updatedRating).not.toBeNull();
      expect(updatedRating!.isApproved()).toBe(true);
    });

    test("when admin approves pending rating, it should persist RatingApproved event to outbox", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const client = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating = Rating.create(client.id, product.id, 5, "Excellent");
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, client);
      await createRatingInDB(container, rating);

      // Act
      await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: client.id.value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const ratingApprovedEvent = events.find(
        (e) => e.eventType === DomainEventCode.RATING_APPROVED,
      );
      expect(ratingApprovedEvent).toBeDefined();
      expect(ratingApprovedEvent!.aggregateId).toBe(
        `${client.id.value}_${product.id.value}`,
      );
      expect((ratingApprovedEvent!.payload as RatingApproved).userId).toBe(
        client.id.value,
      );
      expect((ratingApprovedEvent!.payload as RatingApproved).productId).toBe(
        product.id.value,
      );
      expect((ratingApprovedEvent!.payload as RatingApproved).rating).toBe(5);
    });

    test("when admin approves already approved rating, no additional RatingApproved event should be emitted", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const client = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating = Rating.create(client.id, product.id, 4, "Good");
      rating.approve();
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, client);
      await createRatingInDB(container, rating);

      // Act
      await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: client.id.value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const ratingApprovedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.RATING_APPROVED,
      );
      expect(ratingApprovedEvents).toHaveLength(0);
    });

    test("when admin approves pending rating, exactly one RatingApproved event should be persisted", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const client = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating = Rating.create(client.id, product.id, 3, "Okay");
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, client);
      await createRatingInDB(container, rating);

      // Act
      await request
        .patch(`/api/v1/ratings/product/${product.id.value}`)
        .send({ clientId: client.id.value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const ratingApprovedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.RATING_APPROVED,
      );
      expect(ratingApprovedEvents).toHaveLength(1);
    });
  });
});
