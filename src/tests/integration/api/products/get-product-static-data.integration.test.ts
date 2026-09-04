import type { Container } from "#/composition/container.js";
import {
  clearDatabase,
  createCategoryInDB,
  createProductInDB,
} from "#/tests/helpers/db-helpers.js";
import { productFactory } from "#/tests/helpers/domain-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { Category } from "#/domain/entities/category.js";
import { ProductId } from "#/domain/value-objects/product-id.js";

describe("GET /api/v1/products/:id/static-data", () => {
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
    test("when product exists, it should return 200 with ProductStaticDataDTO", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request.get(
        `/api/v1/products/${product.id.value}/static-data`,
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: product.id.value,
        name: product.getName(),
        slug: product.getSlug().value,
        description: product.getDescription(),
        brand: product.getBrand(),
        material: product.getMaterial(),
        price: expect.objectContaining({
          amount: expect.any(Number),
          currency: "DZD",
        }),
        discountedPrice: expect.objectContaining({
          amount: expect.any(Number),
          currency: "DZD",
        }),
        category: expect.objectContaining({
          id: category.id.value,
          name: category.getName(),
        }),
        averageRating: product.getAverageRating(),
        mainImage: expect.objectContaining({
          name: expect.any(String),
          url: expect.any(String),
        }),
        images: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            url: expect.any(String),
          }),
        ]),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    test("when product does not exist, it should return 404", async () => {
      // Act
      const response = await request.get(
        `/api/v1/products/${ProductId.generate().value}/static-data`,
      );

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });
});
