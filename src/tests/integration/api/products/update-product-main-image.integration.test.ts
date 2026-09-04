import type { Container } from "#/composition/utils/container.js";
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
import {
  PRODUCT_REPOSITORY,
  OUTBOX_REPOSITORY,
} from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { ProductId } from "#/domain/value-objects/product-id.js";

describe("PATCH /api/v1/products/:id/images/main", () => {
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
    test("when called with valid data, it should return 200 with success true", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const newMainImage = {
        key: "new-main-key",
        name: "new-main-name",
        publicUrl: "https://example.com/new-main.jpg",
      };
      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}/images/main`)
        .send(newMainImage)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when product does not exist, it should return 404", async () => {
      // Act
      const response = await request
        .patch(`/api/v1/products/${ProductId.generate().value}/images/main`)
        .send({
          key: "new-main-key",
          name: "new-main-name",
          publicUrl: "https://example.com/new-main.jpg",
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should update the product main image", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const newMainImage = {
        key: "new-main-key",
        name: "new-main-name",
        publicUrl: "https://example.com/new-main.jpg",
      };

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}/images/main`)
        .send(newMainImage)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getMainImage().getKey()).toBe(newMainImage.key);
      expect(updatedProduct!.getMainImage().getName()).toBe(newMainImage.name);
      expect(updatedProduct!.getMainImage().publicUrl).toBe(
        newMainImage.publicUrl,
      );
    });

    test("when called with valid data, it should remove the old main image from product images", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const oldMainImageKey = product.getMainImage().getKey();

      const newMainImage = {
        key: "new-main-key",
        name: "new-main-name",
        publicUrl: "https://example.com/new-main.jpg",
      };

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}/images/main`)
        .send(newMainImage)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      const imageKeys = updatedProduct!.getImages().map((img) => img.getKey());
      expect(imageKeys).not.toContain(oldMainImageKey);
      expect(imageKeys).toContain(newMainImage.key);
    });

    test("when called with valid data, only one image should be main", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const newMainImage = {
        key: "new-main-key",
        name: "new-main-name",
        publicUrl: "https://example.com/new-main.jpg",
      };

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}/images/main`)
        .send(newMainImage)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      const mainImages = updatedProduct!
        .getImages()
        .filter((img) => img.isMain());
      expect(mainImages).toHaveLength(1);
      expect(mainImages[0]!.getKey()).toBe(newMainImage.key);
    });

    test("when called with valid data, it should persist ProductMainImageUpdated event to outbox", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const oldMainImageKey = product.getMainImage().getKey();

      const newMainImage = {
        key: "new-main-key",
        name: "new-main-name",
        publicUrl: "https://example.com/new-main.jpg",
      };

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}/images/main`)
        .send(newMainImage)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const mainImageUpdatedEvent = events.find(
        (e) => e.eventType === DomainEventCode.PRODUCT_MAIN_IMAGE_UPDATED,
      );
      expect(mainImageUpdatedEvent).toBeDefined();
      expect(mainImageUpdatedEvent!.aggregateId).toBe(product.id.value);
      expect(mainImageUpdatedEvent!.payload).toMatchObject({
        newMainImageKey: newMainImage.key,
        previousMainImageKey: oldMainImageKey,
      });
    });
  });
});
