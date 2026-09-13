import type { Container } from "#/composition/utils/container.js";
import { clearDatabase, createRatingInDB } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { Category } from "#/domain/entities/category.js";
import { Rating } from "#/domain/entities/rating.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { adminAuth } from "#/tests/helpers/auth-helpers.js";
import { setupProductAndUserInDB } from "#/tests/helpers/cart-helpers.js";
import { setupProductAndCategory } from "#/tests/helpers/product-helpers.js";

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
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .get(`/api/v1/ratings/client/${user.id.value}`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.ratings).toHaveLength(1);
      expect(response.body.ratings[0]).toEqual({
        userId: rating.userId.value,
        productId: rating.productId.value,
        rating: rating.getRating(),
        comment: rating.getComment(),
        isApproved: rating.isApproved(),
        createdAt: rating.getCreatedAt().toISOString(),
        updatedAt: rating.getUpdatedAt().toISOString(),
      });
      expect(response.body.nextCursor).toBeUndefined();
    });

    test("when client has no ratings, it should return empty array", async () => {
      // Arrange
      const { user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .get(`/api/v1/ratings/client/${user.id.value}`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.ratings).toEqual([]);
      expect(response.body.nextCursor).toBeUndefined();
    });

    test("when using limit, it should return paginated results", async () => {
      // Arrange
      const { product: product1, user } =
        await setupProductAndUserInDB(container);
      const { product: product2 } = await setupProductAndCategory(container, {
        category: Category.create("Category2"), // to avoid creating categories with the same name and getting a conflict error from DB
      });

      const rating1 = Rating.create(user.id, product1.id, 5, "Great!");
      const rating2 = Rating.create(user.id, product2.id, 4, "Good!");

      await createRatingInDB(container, rating1);
      await createRatingInDB(container, rating2);

      // Act
      const response = await request
        .get(`/api/v1/ratings/client/${user.id.value}`)
        .query({ limit: 1 })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.ratings).toHaveLength(1);
      expect(response.body.nextCursor).toBeDefined();
    });

    test("when using cursor, it should return next page", async () => {
      // Arrange
      const { product: product1, user } =
        await setupProductAndUserInDB(container);
      const { product: product2 } = await setupProductAndCategory(container, {
        category: Category.create("Category2"), // to avoid creating categories with the same name and getting a conflict error from DB
      });

      const rating1 = Rating.create(user.id, product1.id, 5, "Great!");
      const rating2 = Rating.create(user.id, product2.id, 4, "Good!");

      await createRatingInDB(container, rating1);
      await createRatingInDB(container, rating2);

      const firstPage = await request
        .get(`/api/v1/ratings/client/${user.id.value}`)
        .query({ limit: 1 })
        .set("authorization", adminAuth());

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
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.ratings).toHaveLength(1);
    });

    test("when client does not exist, it should return 200 with empty array", async () => {
      // Act
      const response = await request
        .get(`/api/v1/ratings/client/${UserId.generate().value}`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.ratings).toEqual([]);
      expect(response.body.nextCursor).toBeUndefined();
    });

    test("when limit is invalid, it should return 400", async () => {
      // Arrange
      const { user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .get(`/api/v1/ratings/client/${user.id.value}`)
        .query({ limit: 0 })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
