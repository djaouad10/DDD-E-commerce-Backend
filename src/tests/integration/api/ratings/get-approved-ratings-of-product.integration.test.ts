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
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { Category } from "#/domain/entities/category.js";
import { User } from "#/domain/entities/user.js";
import { Rating } from "#/domain/entities/rating.js";

describe("GET /api/v1/ratings/approved/:productId", () => {
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
    test("when product has approved ratings, it should return 200 with paginated ratings", async () => {
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

      const rating = Rating.create(user.id, product.id, 5, "Great product!");
      rating.approve();

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);
      await createRatingInDB(container, rating);

      // Act
      const response = await request.get(
        `/api/v1/ratings/approved/${product.id.value}`,
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.ratings).toHaveLength(1);
      expect(response.body.ratings[0]).toEqual({
        userId: user.id.value,
        productId: product.id.value,
        rating: 5,
        comment: "Great product!",
        isApproved: true,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(response.body.nextCursor).toBeUndefined();
    });

    test("when product has no approved ratings, it should return empty array", async () => {
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
      const rating = Rating.create(user.id, product.id, 3, "Okay");

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);
      await createRatingInDB(container, rating);

      // Act
      const response = await request.get(
        `/api/v1/ratings/approved/${product.id.value}`,
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.ratings).toEqual([]);
      expect(response.body.nextCursor).toBeUndefined();
    });

    test("when using limit, it should return paginated results", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const user1 = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const user2 = User.create(
        "Jane",
        "jane@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating1 = Rating.create(user1.id, product.id, 5, "Great!");
      const rating2 = Rating.create(user2.id, product.id, 4, "Good!");

      rating1.approve();
      rating2.approve();

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user1);
      await createUserInDB(container, user2);
      await createRatingInDB(container, rating1);
      await createRatingInDB(container, rating2);

      // Act
      const response = await request
        .get(`/api/v1/ratings/approved/${product.id.value}`)
        .query({ limit: 1 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.ratings).toHaveLength(1);
      expect(response.body.nextCursor).toBeDefined();
    });

    test("when using cursor, it should return next page", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const user1 = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const user2 = User.create(
        "Jane",
        "jane@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const rating1 = Rating.create(user1.id, product.id, 5, "Great!");
      const rating2 = Rating.create(user2.id, product.id, 4, "Good!");

      rating1.approve();
      rating2.approve();

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user1);
      await createUserInDB(container, user2);
      await createRatingInDB(container, rating1);
      await createRatingInDB(container, rating2);

      const firstPage = await request
        .get(`/api/v1/ratings/approved/${product.id.value}`)
        .query({ limit: 1 });

      const cursor = firstPage.body.nextCursor;
      expect(cursor).toBeDefined();

      // Act
      const response = await request
        .get(`/api/v1/ratings/approved/${product.id.value}`)
        .query({
          limit: 1,
          cursor: {
            createdAt: cursor.createdAt,
            userId: cursor.userId,
          },
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.ratings).toHaveLength(1);
    });

    test("when limit is invalid, it should return 400", async () => {
      // Act
      const response = await request
        .get("/api/v1/ratings/approved/some-id")
        .query({ limit: 0 });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
