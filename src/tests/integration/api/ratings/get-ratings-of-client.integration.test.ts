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
import { UserId } from "#/domain/value-objects/user-id.js";

describe("GET /api/v1/ratings/client/:clientId", () => {
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
    test("when client has ratings, it should return 200 with paginated ratings", async () => {
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

      const rating = Rating.create(user.id, product.id, 4, "Nice product");

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);
      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .get(`/api/v1/ratings/client/${user.id.value}`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.ratings).toHaveLength(1);
      expect(response.body.ratings[0]).toEqual({
        userId: user.id.value,
        productId: product.id.value,
        rating: 4,
        comment: "Nice product",
        isApproved: false,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(response.body.nextCursor).toBeUndefined();
    });

    test("when client has no ratings, it should return empty array", async () => {
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
        .get(`/api/v1/ratings/client/${user.id.value}`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.ratings).toEqual([]);
      expect(response.body.nextCursor).toBeUndefined();
    });

    test("when using limit, it should return paginated results", async () => {
      // Arrange
      const category = Category.create("Category");
      const product1 = productFactory({ categoryId: category.id });
      const product2 = productFactory({ categoryId: category.id });
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );

      const rating1 = Rating.create(user.id, product1.id, 5, "Great!");
      const rating2 = Rating.create(user.id, product2.id, 3, "Okay");

      await createCategoryInDB(container, category);
      await createProductInDB(container, product1);
      await createProductInDB(container, product2);
      await createUserInDB(container, user);
      await createRatingInDB(container, rating1);
      await createRatingInDB(container, rating2);

      // Act
      const response = await request
        .get(`/api/v1/ratings/client/${user.id.value}`)
        .query({ limit: 1 })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.ratings).toHaveLength(1);
      expect(response.body.nextCursor).toBeDefined();
    });

    test("when using cursor, it should return next page", async () => {
      // Arrange
      const category = Category.create("Category");
      const product1 = productFactory({ categoryId: category.id });
      const product2 = productFactory({ categoryId: category.id });
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );

      const rating1 = Rating.create(user.id, product1.id, 5, "Great!");
      const rating2 = Rating.create(user.id, product2.id, 3, "Okay");

      await createCategoryInDB(container, category);
      await createProductInDB(container, product1);
      await createProductInDB(container, product2);
      await createUserInDB(container, user);
      await createRatingInDB(container, rating1);
      await createRatingInDB(container, rating2);

      const firstPage = await request
        .get(`/api/v1/ratings/client/${user.id.value}`)
        .query({ limit: 1 })
        .set("authorization", "Bearer test-admin-token");

      const cursor = firstPage.body.nextCursor;
      expect(cursor).toBeDefined();

      // Act
      const response = await request
        .get(`/api/v1/ratings/client/${user.id.value}`)
        .query({
          limit: 1,
          cursor: {
            createdAt: cursor.createdAt,
            productId: cursor.productId,
          },
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.ratings).toHaveLength(1);
    });

    test("when client does not exist, it should return 200 with empty array", async () => {
      // Act
      const response = await request
        .get(`/api/v1/ratings/client/${UserId.generate().value}`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.ratings).toEqual([]);
      expect(response.body.nextCursor).toBeUndefined();
    });

    test("when limit is invalid, it should return 400", async () => {
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
        .get(`/api/v1/ratings/client/${user.id.value}`)
        .query({ limit: 0 })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
