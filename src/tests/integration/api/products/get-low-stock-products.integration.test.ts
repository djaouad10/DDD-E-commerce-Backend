import type { Container } from "#/composition/utils/container.js";
import { clearDatabase } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { Category } from "#/domain/entities/category.js";
import { Variation } from "#/domain/entities/variation.js";
import { Size, Color } from "#/domain/entities/product.js";
import { Weight } from "#/domain/value-objects/weight.js";
import type { ProductCursor } from "#/application/read-models/product.queries.js";
import { adminAuth, clientAuth } from "#/tests/helpers/auth-helpers.js";
import { setupProductAndCategory } from "#/tests/helpers/product-helpers.js";

describe("GET /api/v1/products/low-stock", () => {
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

  function variationFactory({
    color,
    size,
    totalQty,
  }: {
    color: Color;
    size: Size;
    totalQty: number;
  }): Variation {
    return Variation.create(size, color, totalQty, 0, Weight.of(100, "g"));
  }

  describe("Response Validation", () => {
    test("when products have low stock variations, it should return 200 with matching products", async () => {
      // Arrange
      const lowStockVariation = variationFactory({
        color: Color.RED,
        size: Size.M,
        totalQty: 3,
      });

      const { product, category } = await setupProductAndCategory(container, {
        variations: [
          lowStockVariation,
          variationFactory({ color: Color.BLUE, size: Size.L, totalQty: 100 }),
        ],
      });

      // Act
      const response = await request
        .get("/api/v1/products/low-stock")
        .query({ limit: 10, minStock: 10 })
        .set("authorization", adminAuth());

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
      await setupProductAndCategory(container, {
        variations: [
          variationFactory({ color: Color.BLUE, size: Size.L, totalQty: 100 }),
          variationFactory({
            color: Color.NAVY,
            size: Size.M,
            totalQty: 90,
          }),
        ],
      });

      // Act
      const response = await request
        .get("/api/v1/products/low-stock")
        .query({ limit: 10, minStock: 10 })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.products).toEqual([]);
      expect(response.body.nextCursor).toBeUndefined();
    });

    test("when using default params, it should return results", async () => {
      // Arrange

      await setupProductAndCategory(container, {
        variations: [
          variationFactory({ color: Color.BLUE, size: Size.L, totalQty: 100 }),
          variationFactory({
            color: Color.RED,
            size: Size.M,
            totalQty: 3,
          }),
        ],
      });

      // Act — no query params, uses defaults (limit=10, minStock=10)
      const response = await request
        .get("/api/v1/products/low-stock")
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.products.length).toBe(1);
    });

    test("when using cursor, it should return next page", async () => {
      // Arrange
      await setupProductAndCategory(container, {
        variations: [
          variationFactory({
            color: Color.RED,
            size: Size.M,
            totalQty: 3,
          }),
        ],
        category: Category.create("Category 1"),
      });

      await setupProductAndCategory(container, {
        variations: [
          variationFactory({
            color: Color.RED,
            size: Size.M,
            totalQty: 3,
          }),
        ],
        category: Category.create("Category 2"), // to avoid duplicate category names in DB
      });

      const firstPage = await request
        .get("/api/v1/products/low-stock")
        .query({ limit: 1, minStock: 10 })
        .set("authorization", adminAuth());

      const cursor: ProductCursor = firstPage.body.nextCursor;
      expect(cursor).toBeDefined();

      // Act
      const response = await request
        .get("/api/v1/products/low-stock")
        .query({
          limit: 1,
          minStock: 10,
          cursor: {
            createdAt: cursor.createdAt,
            productId: cursor.productId,
          },
        })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(1);
    });

    test("when limit is invalid, it should return 400", async () => {
      // Act
      const response = await request
        .get("/api/v1/products/low-stock")
        .query({ limit: 0, minStock: 10 })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when minStock is invalid, it should return 400", async () => {
      // Act
      const response = await request
        .get("/api/v1/products/low-stock")
        .query({ limit: 10, minStock: -1 })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when client token is used, it should return 403", async () => {
      // Act
      const response = await request
        .get("/api/v1/products/low-stock")
        .query({ limit: 10, minStock: 10 })
        .set("authorization", clientAuth());

      // Assert
      expect(response.status).toBe(403);
    });
  });
});
