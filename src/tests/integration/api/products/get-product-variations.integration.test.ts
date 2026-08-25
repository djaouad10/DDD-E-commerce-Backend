import type { Container } from "#/composition/container.js";
import { Category } from "#/domain/entities/category.js";
import { Color, Size } from "#/domain/entities/product.js";
import { Variation } from "#/domain/entities/variation.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { Weight } from "#/domain/value-objects/weight.js";
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

describe("GET /api/v1/products/:id/variations", () => {
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
    test("when product has variations, it should return 200 with array of VariationDTOs", async () => {
      // Arrange
      const category = Category.create("Category");

      const variations = [
        Variation.create(Size.M, Color.RED, 100, 50, Weight.of(100, "g")),
        Variation.create(Size.L, Color.BLUE, 100, 50, Weight.of(100, "g")),
        Variation.create(Size.XL, Color.GREEN, 100, 50, Weight.of(100, "g")),
        Variation.create(Size.XL, Color.BEIGE, 100, 50, Weight.of(100, "g")),
      ];

      const product = productFactory({
        categoryId: category.id,
        customVariations: variations,
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request.get(
        `/api/v1/products/${product.id.value}/variations`,
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(4);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            size: expect.any(String),
            color: expect.any(String),
            totalQty: expect.any(Number),
            reservedQty: expect.any(Number),
            availableQty: expect.any(Number),
            isInStock: expect.any(Boolean),
            weightInGrams: expect.objectContaining({
              unit: expect.any(String),
              weight: expect.any(Number),
            }),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
        ]),
      );
    });

    test("when product does not exist, it should return 404", async () => {
      // Act
      const response = await request.get(
        `/api/v1/products/${ProductId.generate().value}/variations`,
      );

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Data Correctness", () => {
    test("it should return the correct variations for the requested product", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const expectedVariations = product.getVariations();

      // Act
      const response = await request.get(
        `/api/v1/products/${product.id.value}/variations`,
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(expectedVariations.length);

      const variationIds = response.body.map((v: any) => v.id);
      expectedVariations.forEach((variation) => {
        expect(variationIds).toContain(variation.id.value);
      });
    });
  });
});
