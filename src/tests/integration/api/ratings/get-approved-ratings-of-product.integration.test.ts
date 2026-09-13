import type { Container } from "#/composition/utils/container.js";
import {
  clearDatabase,
  createUserInDB,
  createRatingInDB,
} from "#/tests/helpers/db-helpers.js";
import { userFactory } from "#/tests/helpers/domain-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { Rating } from "#/domain/entities/rating.js";
import { setupProductAndUserInDB } from "#/tests/helpers/cart-helpers.js";

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
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");
      rating.approve();

      await createRatingInDB(container, rating);

      // Act
      const response = await request.get(
        `/api/v1/ratings/approved/${product.id.value}`,
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.ratings).toHaveLength(1);
      expect(response.body.ratings[0]).toEqual({
        userId: rating.userId.value,
        productId: rating.productId.value,
        rating: rating.getRating(),
        comment: rating.getComment(),
        isApproved: true,
        createdAt: rating.getCreatedAt().toISOString(),
        updatedAt: rating.getUpdatedAt().toISOString(),
      });
      expect(response.body.nextCursor).toBeUndefined();
    });

    test("when product has no approved ratings, it should return empty array", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

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
      const { product, user: user1 } = await setupProductAndUserInDB(container);
      const user2 = userFactory();
      await createUserInDB(container, user2);

      const rating1 = Rating.create(user1.id, product.id, 5, "Great!");
      const rating2 = Rating.create(user2.id, product.id, 4, "Good!");

      rating1.approve();
      rating2.approve();

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
      const { product, user: user1 } = await setupProductAndUserInDB(container);
      const user2 = userFactory();
      await createUserInDB(container, user2);

      const rating1 = Rating.create(user1.id, product.id, 5, "Great!");
      const rating2 = Rating.create(user2.id, product.id, 4, "Good!");

      rating1.approve();
      rating2.approve();

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
