import type { Container } from "#/composition/container.js";
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
import { ProductId } from "#/domain/value-objects/product-id.js";

describe("GET /api/v1/ratings/did-i-rate/:productId", () => {
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
    test("when user has rated the product, it should return 200 with didUserRate true", async () => {
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

      const rating = Rating.create(user.id, product.id, 4, "Good product");

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);
      await createRatingInDB(container, rating);

      // Act
      const response = await request
        .get(`/api/v1/ratings/did-i-rate/${product.id.value}`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ didUserRate: true });
    });

    test("when user has not rated the product, it should return 200 with didUserRate false", async () => {
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
        .get(`/api/v1/ratings/did-i-rate/${product.id.value}`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ didUserRate: false });
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

      // Act
      const response = await request
        .get(`/api/v1/ratings/did-i-rate/${product.id.value}`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
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
        .get(`/api/v1/ratings/did-i-rate/${ProductId.generate().value}`)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when admin token is used, it should return 403", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .get(`/api/v1/ratings/did-i-rate/${product.id.value}`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(403);
    });
  });
});
