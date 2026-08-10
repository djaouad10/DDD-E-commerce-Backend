import type { Container } from "#/composition/container.js";
import { Category } from "#/domain/entities/category.js";
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
import { PRODUCT_REPOSITORY, OUTBOX_REPOSITORY } from "#/composition/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { ProductId } from "#/domain/value-objects/product-id.js";

describe("DELETE /api/v1/products/:id/images/:key", () => {
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
    test("when called with valid non-main image, it should return 200 with success true", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const nonMainImage = product.getImages().find((img) => !img.isMain())!;

      // Act
      const response = await request
        .delete(
          `/api/v1/products/${product.id.value}/images/${nonMainImage.getKey()}`,
        )
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when product does not exist, it should return 404", async () => {
      // Act
      const response = await request
        .delete(
          `/api/v1/products/${ProductId.generate().value}/images/some-key`,
        )
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when image does not exist, it should return 404", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .delete(`/api/v1/products/${product.id.value}/images/nonexistent-key`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when trying to delete main image, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const mainImage = product.getMainImage();

      // Act
      const response = await request
        .delete(
          `/api/v1/products/${product.id.value}/images/${mainImage.getKey()}`,
        )
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("New State Validation", () => {
    test("when called with valid non-main image, it should remove the image from product", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const nonMainImage = product.getImages().find((img) => !img.isMain())!;
      const imageKeyToRemove = nonMainImage.getKey();

      // Act
      await request
        .delete(
          `/api/v1/products/${product.id.value}/images/${imageKeyToRemove}`,
        )
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      const imageKeys = updatedProduct!.getImages().map((img) => img.getKey());
      expect(imageKeys).not.toContain(imageKeyToRemove);
    });

    test("when called with valid non-main image, it should persist ProductImageRemoved event to outbox", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const nonMainImage = product.getImages().find((img) => !img.isMain())!;
      const imageKeyToRemove = nonMainImage.getKey();

      // Act
      await request
        .delete(
          `/api/v1/products/${product.id.value}/images/${imageKeyToRemove}`,
        )
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const imageRemovedEvent = events.find(
        (e) => e.eventType === DomainEventCode.PRODUCT_IMAGE_REMOVED,
      );
      expect(imageRemovedEvent).toBeDefined();
      expect(imageRemovedEvent!.aggregateId).toBe(product.id.value);
      expect(imageRemovedEvent!.payload).toMatchObject({
        imageKey: imageKeyToRemove,
      });
    });

    test("when removing image, main image should remain unchanged", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const mainImageKey = product.getMainImage().getKey();
      const nonMainImage = product.getImages().find((img) => !img.isMain())!;

      // Act
      await request
        .delete(
          `/api/v1/products/${product.id.value}/images/${nonMainImage.getKey()}`,
        )
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getMainImage().getKey()).toBe(mainImageKey);
      expect(updatedProduct!.getImages()).toHaveLength(1);
      expect(updatedProduct!.getImages()[0]!.isMain()).toBe(true);
    });
  });
});
