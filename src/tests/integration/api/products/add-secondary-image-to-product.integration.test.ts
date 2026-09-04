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
import type { FileUploaded } from "#/domain/events/file/file-uploaded.js";
import type { ProductImageAdded } from "#/domain/events/product/product-image-added.js";

describe("POST /api/v1/products/:id/images", () => {
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
    test("when called with valid data and product exists, it should return 200 with success true", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const imageData = {
        key: "test-image-key",
        name: "test-image.jpg",
        public_url: "https://example.com/test-image.jpg",
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(imageData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when product does not exist, it should return 404", async () => {
      // Arrange
      const imageData = {
        key: "test-image-key",
        name: "test-image.jpg",
        public_url: "https://example.com/test-image.jpg",
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${ProductId.generate().value}/images`)
        .send(imageData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when called with invalid product id format, it should return 400", async () => {
      // Arrange
      const imageData = {
        key: "test-image-key",
        name: "test-image.jpg",
        public_url: "https://example.com/test-image.jpg",
      };

      // Act
      const response = await request
        .post("/api/v1/products/invalid-id/images")
        .send(imageData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with missing key, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const imageData = {
        name: "test-image.jpg",
        public_url: "https://example.com/test-image.jpg",
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(imageData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with missing name, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const imageData = {
        key: "test-image-key",
        public_url: "https://example.com/test-image.jpg",
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(imageData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with invalid public_url, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const imageData = {
        key: "test-image-key",
        name: "test-image.jpg",
        public_url: "invalid-url",
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(imageData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when client token is used (non-admin), it should return 403", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const imageData = {
        key: "test-image-key",
        name: "test-image.jpg",
        public_url: "https://example.com/test-image.jpg",
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(imageData)
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

      const imageData = {
        key: "test-image-key",
        name: "test-image.jpg",
        public_url: "https://example.com/test-image.jpg",
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(imageData);

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should add the image to the product", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const initialImageCount = product.getImages().length;

      const imageData = {
        key: "new-image-key",
        name: "new-image.jpg",
        public_url: "https://example.com/new-image.jpg",
      };

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(imageData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getImages()).toHaveLength(initialImageCount + 1);

      const addedImage = updatedProduct!
        .getImages()
        .find((img) => img.getKey() === imageData.key);
      expect(addedImage).toBeDefined();
      expect(addedImage!.getName()).toBe(imageData.name);
      expect(addedImage!.publicUrl).toBe(imageData.public_url);
      expect(addedImage!.isMain()).toBe(false);
    });

    test("when called with valid data, the new image should NOT be set as main", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const imageData = {
        key: "new-image-key",
        name: "new-image.jpg",
        public_url: "https://example.com/new-image.jpg",
      };

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(imageData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      const addedImage = updatedProduct!
        .getImages()
        .find((img) => img.getKey() === imageData.key);
      expect(addedImage).toBeDefined();
      expect(addedImage!.isMain()).toBe(false);

      // Ensure main image is still the same
      const mainImages = updatedProduct!
        .getImages()
        .filter((img) => img.isMain());
      expect(mainImages).toHaveLength(1);
      expect(mainImages[0]!.getKey()).toBe(product.getMainImage().getKey());
    });

    test("when called with valid data, it should preserve existing images", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const existingImageKeys = product.getImages().map((img) => img.getKey());

      const imageData = {
        key: "new-image-key",
        name: "new-image.jpg",
        public_url: "https://example.com/new-image.jpg",
      };

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(imageData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      const updatedImageKeys = updatedProduct!
        .getImages()
        .map((img) => img.getKey());

      // All existing images should still be present
      existingImageKeys.forEach((key) => {
        expect(updatedImageKeys).toContain(key);
      });

      // New image should be added
      expect(updatedImageKeys).toContain(imageData.key);
    });
  });

  describe("Event Persistence", () => {
    test("when called with valid data, it should persist FileUploaded event to outbox", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const imageData = {
        key: "test-image-key",
        name: "test-image.jpg",
        public_url: "https://example.com/test-image.jpg",
      };

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(imageData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const fileUploadedEvent = events.find(
        (e) => e.eventType === DomainEventCode.FILE_UPLOADED,
      );

      const newImage = (await productRepository.find(product.id))!
        .getImages()
        .find((img) => img.getKey() === imageData.key);

      expect(fileUploadedEvent).toBeDefined();
      expect(fileUploadedEvent!.aggregateId).toBe(newImage!.id.value);
      expect((fileUploadedEvent!.payload as FileUploaded).productId).toBe(
        product.id.value,
      );
      expect((fileUploadedEvent!.payload as FileUploaded).key).toBe(
        imageData.key,
      );
      expect((fileUploadedEvent!.payload as FileUploaded).isMain).toBe(false);
    });

    test("when called with valid data, it should persist ProductImageAdded event to outbox", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const imageData = {
        key: "test-image-key",
        name: "test-image.jpg",
        public_url: "https://example.com/test-image.jpg",
      };

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(imageData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const productImageAddedEvent = events.find(
        (e) => e.eventType === DomainEventCode.PRODUCT_IMAGE_ADDED,
      );
      expect(productImageAddedEvent).toBeDefined();
      expect(productImageAddedEvent!.aggregateId).toBe(product.id.value);
      expect(
        (productImageAddedEvent!.payload as ProductImageAdded).imageId,
      ).toBeDefined();
      expect(
        (productImageAddedEvent!.payload as ProductImageAdded).isMain,
      ).toBe(false);
    });

    test("when called with valid data, it should persist both events to outbox", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const imageData = {
        key: "test-image-key",
        name: "test-image.jpg",
        public_url: "https://example.com/test-image.jpg",
      };

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(imageData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const eventTypes = events.map((e) => e.eventType);
      expect(eventTypes).toContain(DomainEventCode.FILE_UPLOADED);
      expect(eventTypes).toContain(DomainEventCode.PRODUCT_IMAGE_ADDED);

      // Should have exactly 2 events
      const fileUploadedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.FILE_UPLOADED,
      );
      const productImageAddedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.PRODUCT_IMAGE_ADDED,
      );

      expect(fileUploadedEvents).toHaveLength(1);
      expect(productImageAddedEvents).toHaveLength(1);
    });

    test("when adding multiple images, each should have its own events", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const imageData1 = {
        key: "image-1-key",
        name: "image-1.jpg",
        public_url: "https://example.com/image-1.jpg",
      };

      const imageData2 = {
        key: "image-2-key",
        name: "image-2.jpg",
        public_url: "https://example.com/image-2.jpg",
      };

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(imageData1)
        .set("authorization", "Bearer test-admin-token");

      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(imageData2)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const fileUploadedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.FILE_UPLOADED,
      );
      const productImageAddedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.PRODUCT_IMAGE_ADDED,
      );

      expect(fileUploadedEvents).toHaveLength(2);
      expect(productImageAddedEvents).toHaveLength(2);

      // Verify first image
      expect((fileUploadedEvents[0]!.payload as FileUploaded).key).toBe(
        imageData1.key,
      );
      expect(
        (productImageAddedEvents[0]!.payload as ProductImageAdded).isMain,
      ).toBe(false);

      // Verify second image
      expect((fileUploadedEvents[1]!.payload as FileUploaded).key).toBe(
        imageData2.key,
      );
      expect(
        (productImageAddedEvents[1]!.payload as ProductImageAdded).isMain,
      ).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    test("when adding an image with a duplicate key, it should return 409", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const imageData = {
        key: "duplicate-key",
        name: "image.jpg",
        public_url: "https://example.com/image.jpg",
      };

      // Act - Add first image
      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(imageData)
        .set("authorization", "Bearer test-admin-token");

      // Act - Add second image with same key
      const response = await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send({
          ...imageData,
          name: "image-copy.jpg",
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(409);
    });

    test("when product has many images, adding a new one should work", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Add 5 images
      for (let i = 0; i < 5; i++) {
        const imageData = {
          key: `image-${i}-key`,
          name: `image-${i}.jpg`,
          public_url: `https://example.com/image-${i}.jpg`,
        };

        await request
          .post(`/api/v1/products/${product.id.value}/images`)
          .send(imageData)
          .set("authorization", "Bearer test-admin-token");
      }

      // Act - Add one more
      const newImageData = {
        key: "final-image-key",
        name: "final-image.jpg",
        public_url: "https://example.com/final-image.jpg",
      };

      const response = await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(newImageData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);

      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      // Initial product had 2 images from factory, plus 5 + 1 = 8 total
      expect(updatedProduct!.getImages()).toHaveLength(8);
    });
  });
});
