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
import { PRODUCT_REPOSITORY } from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { adminAuth, clientAuth } from "#/tests/helpers/auth-helpers.js";
import {
  expectOutboxEvent,
  expectOutboxEventCount,
} from "#/tests/helpers/outbox-assertions.js";
import { setupProductAndCategory } from "#/tests/helpers/product-helpers.js";

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

  const validBody = {
    key: "test-image-key",
    name: "test-image.jpg",
    public_url: "https://example.com/test-image.jpg",
  };

  describe("Response Validation", () => {
    test("when called with valid data and product exists, it should return 200 with success true", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container);

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when product does not exist, it should return 404", async () => {
      // Arrange
      const nonExistentProductId = ProductId.generate().value;

      // Act
      const response = await request
        .post(`/api/v1/products/${nonExistentProductId}/images`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when called with invalid product id format, it should return 400", async () => {
      // Arrange
      const invalidProductId = "invalid-id";

      // Act
      const response = await request
        .post(`/api/v1/products/${invalidProductId}/images`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test.each([
      [
        "missing key",
        {
          name: "test-image.jpg",
          public_url: "https://example.com/test-image.jpg",
        },
      ],
      [
        "missing name",
        {
          key: "test-image-key",
          public_url: "https://example.com/test-image.jpg",
        },
      ],
      [
        "missing public_url",
        {
          key: "test-image-key",
          name: "test-image.jpg",
        },
      ],
    ])("when called with  %s, it should return 400", async (_, imageData) => {
      // Arrange
      const { product } = await setupProductAndCategory(container);

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(imageData)
        .set("authorization", adminAuth());

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

      const imageData = { ...validBody, public_url: "invalid-url" };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(imageData)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when client token is used (non-admin), it should return 403", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container);

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(validBody)
        .set("authorization", clientAuth());

      // Assert
      expect(response.status).toBe(403);
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container);

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(validBody);

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should add the image to the product", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container);
      const initialImageCount = product.getImages().length;

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getImages()).toHaveLength(initialImageCount + 1);

      const addedImage = updatedProduct!
        .getImages()
        .find((img) => img.getKey() === validBody.key);
      expect(addedImage).toBeDefined();
      expect(addedImage!.getName()).toBe(validBody.name);
      expect(addedImage!.publicUrl).toBe(validBody.public_url);
      expect(addedImage!.isMain()).toBe(false);
    });

    test("when called with valid data, the new image should NOT be set as main", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container);

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      const addedImage = updatedProduct!
        .getImages()
        .find((img) => img.getKey() === validBody.key);
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
      const { product } = await setupProductAndCategory(container);

      const existingImageKeys = product.getImages().map((img) => img.getKey());

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(validBody)
        .set("authorization", adminAuth());

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
      expect(updatedImageKeys).toContain(validBody.key);
    });
  });

  describe("Event Persistence", () => {
    test("when called with valid data, it should persist FileUploaded event to outbox", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container);

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.FILE_UPLOADED,
      );

      expect(event.payload).toMatchObject({
        aggregateId: expect.any(String),
        productId: product.id.value,
        key: validBody.key,
        isMain: false,
      });
    });

    test("when called with valid data, it should persist ProductImageAdded event to outbox", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container);

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.PRODUCT_IMAGE_ADDED,
        product.id.value,
      );

      expect(event.payload).toMatchObject({
        aggregateId: product.id.value,
        imageId: expect.any(String),
        isMain: false,
      });
    });

    test("when called with valid data, it should persist both events to outbox", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container);

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEvent(container, DomainEventCode.FILE_UPLOADED);

      await expectOutboxEvent(
        container,
        DomainEventCode.PRODUCT_IMAGE_ADDED,
        product.id.value,
      );
    });

    test("when adding multiple images, each should have its own events", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container);
      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(validBody)
        .set("authorization", adminAuth());

      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send({ ...validBody, key: "second-image-key" })
        .set("authorization", adminAuth());

      // Assert
      expectOutboxEventCount(container, DomainEventCode.FILE_UPLOADED, 2);

      expectOutboxEventCount(container, DomainEventCode.PRODUCT_IMAGE_ADDED, 2);
    });
  });

  describe("Edge Cases", () => {
    test("when adding an image with a duplicate key, it should return 409", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container);
      // Act - Add first image
      await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Act - Add second image with same key
      const response = await request
        .post(`/api/v1/products/${product.id.value}/images`)
        .send({
          ...validBody,
          name: "image-copy.jpg",
        })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(409);
    });
  });
});
