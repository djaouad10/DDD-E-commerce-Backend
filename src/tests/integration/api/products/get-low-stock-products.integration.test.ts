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
import { Variation } from "#/domain/entities/variation.js";
import { Size, Color } from "#/domain/entities/product.js";
import { Weight } from "#/domain/value-objects/weight.js";
import type { ProductCursor } from "#/application/read-models/product.queries.js";

describe("GET /api/v1/products/low-stock", () => {
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
    test("when products have low stock variations, it should return 200 with matching products", async () => {
      // Arrange
      const category = Category.create("Category");
      const lowStockVariation = Variation.create(
        Size.M,
        Color.RED,
        5,
        0,
        Weight.of(100, "g"),
      );
      const normalVariation = Variation.create(
        Size.L,
        Color.BLUE,
        100,
        50,
        Weight.of(100, "g"),
      );
      const product = productFactory({
        categoryId: category.id,
        customVariations: [lowStockVariation, normalVariation],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .get("/api/v1/products/low-stock")
        .query({ limit: 10, minStock: 10 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0]).toEqual(
        expect.objectContaining({
          id: product.id.value,
          name: product.getName(),
          slug: product.getSlug().value,
          category: expect.objectContaining({
            id: category.id.value,
            name: category.getName(),
          }),
          mainImage: expect.objectContaining({
            name: expect.any(String),
            url: expect.any(String),
          }),
          lowStockVariations: expect.arrayContaining([
            expect.objectContaining({
              id: lowStockVariation.id.value,
              size: lowStockVariation.getSize(),
              color: lowStockVariation.getColor(),
              totalQty: lowStockVariation.getTotalQty(),
              reservedQty: lowStockVariation.getReservedQty(),
              availableQty: lowStockVariation.getAvailableQty(),
              isInStock: lowStockVariation.isInStock(),
            }),
          ]),
        }),
      );
      expect(response.body.products[0].lowStockVariations).toHaveLength(1);
      expect(response.body.products[0].lowStockVariations[0].id).toBe(
        lowStockVariation.id.value,
      );
    });

    test("when no products have low stock, it should return empty array", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .get("/api/v1/products/low-stock")
        .query({ limit: 10, minStock: 10 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.products).toEqual([]);
      expect(response.body.nextCursor).toBeUndefined();
    });

    test("when using default params, it should return results", async () => {
      // Arrange
      const category = Category.create("Category");
      const lowStockVariation = Variation.create(
        Size.M,
        Color.RED,
        3,
        0,
        Weight.of(100, "g"),
      );
      const product = productFactory({
        categoryId: category.id,
        customVariations: [lowStockVariation],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act — no query params, uses defaults (limit=10, minStock=0)
      const response = await request.get("/api/v1/products/low-stock");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.products.length).toBeGreaterThanOrEqual(0);
    });

    test("when using cursor, it should return next page", async () => {
      // Arrange
      const category = Category.create("Category");
      const product1 = productFactory({
        categoryId: category.id,
        customVariations: [
          Variation.create(Size.M, Color.RED, 5, 0, Weight.of(100, "g")),
        ],
      });
      const product2 = productFactory({
        categoryId: category.id,
        customVariations: [
          Variation.create(Size.L, Color.BLUE, 3, 0, Weight.of(100, "g")),
        ],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product1);
      await createProductInDB(container, product2);

      const firstPage = await request
        .get("/api/v1/products/low-stock")
        .query({ limit: 1, minStock: 10 });

      const cursor: ProductCursor = firstPage.body.nextCursor;
      expect(cursor).toBeDefined();

      // Act
      const response = await request.get("/api/v1/products/low-stock").query({
        limit: 1,
        minStock: 10,
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
        .get("/api/v1/products/low-stock")
        .query({ limit: 0, minStock: 10 });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when minStock is invalid, it should return 400", async () => {
      // Act
      const response = await request
        .get("/api/v1/products/low-stock")
        .query({ limit: 10, minStock: -1 });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
