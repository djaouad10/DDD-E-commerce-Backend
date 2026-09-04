import type { Container } from "#/composition/utils/container.js";
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
import type { ProductCursor } from "#/application/read-models/product.queries.js";

describe("GET /api/v1/products", () => {
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
    test("when called with valid params, it should return 200 with paginated products list", async () => {
      // Arrange
      const category = Category.create("Category");
      const product1 = productFactory({ categoryId: category.id });
      const product2 = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product1);
      await createProductInDB(container, product2);

      // Act
      const response = await request
        .get("/api/v1/products")
        .query({ limit: 1 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          slug: expect.any(String),
          description: expect.any(String),
          brand: expect.any(String),
          material: expect.any(String),
          price: expect.objectContaining({
            amount: expect.any(Number),
            currency: expect.any(String),
          }),
          discountedPrice: expect.any(Object),
          category: expect.any(Object),
          averageRating: expect.any(Object),
          mainImage: expect.any(Object),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );
      expect(response.body.nextCursor).toBeDefined();
    });

    test("when filtering by categoryId, it should return only products in that category", async () => {
      // Arrange
      const category1 = Category.create("Category 1");
      const category2 = Category.create("Category 2");
      const product1 = productFactory({ categoryId: category1.id });
      const product2 = productFactory({ categoryId: category2.id });

      await createCategoryInDB(container, category1);
      await createCategoryInDB(container, category2);
      await createProductInDB(container, product1);
      await createProductInDB(container, product2);

      // Act
      const response = await request
        .get("/api/v1/products")
        .query({ limit: 10, categoryId: category1.id.value });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].id).toBe(product1.id.value);
    });

    test("when filtering by price range, it should return only matching products", async () => {
      // Arrange
      const category = Category.create("Category");
      const product1 = productFactory({
        categoryId: category.id,
        price: 3000, // above request range
        discountPrice: 1500, // but discount price is in range
      });

      const product2 = productFactory({
        categoryId: category.id,
        price: 4000, // out of range
        discountPrice: 3500, // out of range
      });

      const product3 = productFactory({
        categoryId: category.id,
        price: 2000, // in range
      });

      const product4 = productFactory({
        categoryId: category.id,
        price: 500, // under request range
        discountPrice: 450, // under request range
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product1);
      await createProductInDB(container, product2);
      await createProductInDB(container, product3);
      await createProductInDB(container, product4);

      // Act
      const response = await request
        .get("/api/v1/products")
        .query({ limit: 10, min_price: 1000, max_price: 2500 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.products.length).toBe(2);
    });

    test("when using cursor, it should return next page", async () => {
      // Arrange
      const category = Category.create("Category");
      const product1 = productFactory({ categoryId: category.id });
      const product2 = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product1);
      await createProductInDB(container, product2);

      const firstPage = await request
        .get("/api/v1/products")
        .query({ limit: 1 });

      const cursor: ProductCursor = firstPage.body.nextCursor;

      // Act
      const response = await request.get("/api/v1/products").query({
        limit: 1,
        cursor: {
          createdAt: cursor.createdAt,
          productId: cursor.productId,
        },
      });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
    });

    test("when limit is invalid, it should return 400", async () => {
      // Act
      const response = await request
        .get("/api/v1/products")
        .query({ limit: 0 });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when max_price is less than min_price, it should return 400", async () => {
      // Act
      const response = await request
        .get("/api/v1/products")
        .query({ limit: 10, min_price: 1000, max_price: 500 });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when max_price is negative, it should return 400", async () => {
      // Act
      const response = await request
        .get("/api/v1/products")
        .query({ limit: 10, max_price: -100 });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when min_price is negative, it should return 400", async () => {
      // Act
      const response = await request
        .get("/api/v1/products")
        .query({ limit: 10, min_price: -100 });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("Pagination Edge Cases", () => {
    test("when no products exist, it should return empty array with no nextCursor", async () => {
      // Act
      const response = await request
        .get("/api/v1/products")
        .query({ limit: 10 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.products).toEqual([]);
      expect(response.body.nextCursor).toBeUndefined();
    });

    test("when limit exceeds total products, nextCursor should be undefined", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .get("/api/v1/products")
        .query({ limit: 100 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.nextCursor).toBeUndefined();
    });
  });
});
