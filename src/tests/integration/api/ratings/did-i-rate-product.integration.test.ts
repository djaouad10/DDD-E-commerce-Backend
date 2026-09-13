import type { Container } from "#/composition/utils/container.js";
import { clearDatabase, createRatingInDB } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { Rating } from "#/domain/entities/rating.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { adminAuth, clientAuth } from "#/tests/helpers/auth-helpers.js";
import { setupProductAndUserInDB } from "#/tests/helpers/cart-helpers.js";
import { UserId } from "#/domain/value-objects/user-id.js";

describe("GET /api/v1/ratings/did-i-rate/:productId", () => {
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
    test("when user has rated the product, it should return 200 with didUserRate true", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .get(`/api/v1/ratings/did-i-rate/${product.id.value}`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ didUserRate: true });
    });

    test("when user has not rated the product, it should return 200 with didUserRate false", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .get(`/api/v1/ratings/did-i-rate/${product.id.value}`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ didUserRate: false });
    });

    test("when user does not exist, it should return 404", async () => {
      // Arrange
      const { product } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .get(`/api/v1/ratings/did-i-rate/${product.id.value}`)
        .set("authorization", clientAuth(UserId.generate().value));

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when product does not exist, it should return 404", async () => {
      // Arrange
      const { user } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .get(`/api/v1/ratings/did-i-rate/${ProductId.generate().value}`)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when admin token is used, it should return 403", async () => {
      // Arrange
      const { product, user } = await setupProductAndUserInDB(container);

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .get(`/api/v1/ratings/did-i-rate/${product.id.value}`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(403);
    });
  });
});
