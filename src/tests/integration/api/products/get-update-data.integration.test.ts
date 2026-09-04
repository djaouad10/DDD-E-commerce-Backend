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

describe("GET /api/v1/products/:id/update-data", () => {
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
    test("when admin requests update data for existing product, it should return 200 with product, images and variations", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const mainImage = product.getMainImage();
      const variations = product.getVariations();

      // Act
      const response = await request
        .get(`/api/v1/products/${product.id.value}/update-data`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);

      // Product shape
      expect(response.body.product).toEqual(
        expect.objectContaining({
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
            name: mainImage.getName(),
            url: mainImage.publicUrl,
          }),
          images: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              url: expect.any(String),
            })
          ]),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );

      // Images shape
      expect(response.body.product.images).toHaveLength(product.getImages().length);
  
      expect(
        response.body.product.images.some(
          (img: any) => img.name === mainImage.getName(),
        ),
      ).toBe(true);

      // Variations shape
      expect(response.body.variations).toHaveLength(variations.length);
      expect(response.body.variations).toEqual(
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
              weight: expect.any(Number),
              unit: expect.any(String),
            }),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
        ]),
      );

      // Verify specific variation IDs
      const variationIds = response.body.variations.map((v: any) => v.id);
      variations.forEach((v) => {
        expect(variationIds).toContain(v.id.value);
      });
    });

    test("when product does not exist, it should return 404", async () => {
      // Act
      const response = await request
        .get(`/api/v1/products/${ProductId.generate().value}/update-data`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when client token is used, it should return 403", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .get(`/api/v1/products/${product.id.value}/update-data`)
        .set("authorization", "Bearer test-client-token");

      // Assert
      expect(response.status).toBe(403);
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request.get(
        `/api/v1/products/${product.id.value}/update-data`,
      );

      // Assert
      expect(response.status).toBe(401);
    });
  });
});
