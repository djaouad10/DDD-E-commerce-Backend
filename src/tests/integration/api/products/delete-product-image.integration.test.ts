import type { Container } from "#/composition/utils/container.js";
import { clearDatabase } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { PRODUCT_REPOSITORY } from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { adminAuth } from "#/tests/helpers/auth-helpers.js";
import { setupProductAndCategory } from "#/tests/helpers/product-helpers.js";
import { File } from "#/domain/entities/file.js";
import { expectOutboxEvent } from "#/tests/helpers/outbox-assertions.js";

describe("DELETE /api/v1/products/:id/images/:key", () => {
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
    test("when called with valid non-main image, it should return 200 with success true", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        images: [
          File.create("key1", "name1", "https://example.com/key1", true),
          File.create("key2", "name2", "https://example.com/key2", false),
        ],
      });

      const secondaryImage = product.getImageByKey("key2");

      if (!secondaryImage) throw new Error("Non-main image not found");

      // Act
      const response = await request
        .delete(
          `/api/v1/products/${product.id.value}/images/${secondaryImage.getKey()}`,
        )
        .set("authorization", adminAuth());

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
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when image does not exist, it should return 404", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        images: [
          File.create("key1", "name1", "https://example.com/key1", true),
          File.create("key2", "name2", "https://example.com/key2", false),
        ],
      });

      // Act
      const response = await request
        .delete(`/api/v1/products/${product.id.value}/images/nonexistent-key`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when trying to delete main image, it should return 400", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        images: [
          File.create("key1", "name1", "https://example.com/key1", true),
          File.create("key2", "name2", "https://example.com/key2", false),
        ],
      });

      const mainImage = product.getMainImage();

      // Act
      const response = await request
        .delete(
          `/api/v1/products/${product.id.value}/images/${mainImage.getKey()}`,
        )
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("New State Validation", () => {
    test("when called with valid non-main image, it should remove the image from product", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        images: [
          File.create("key1", "name1", "https://example.com/key1", true),
          File.create("key2", "name2", "https://example.com/key2", false),
        ],
      });

      const secondaryImage = product.getImages().find((img) => !img.isMain());

      if (!secondaryImage) throw new Error("Non-main image not found");

      const imageKeyToRemove = secondaryImage.getKey();

      // Act
      await request
        .delete(
          `/api/v1/products/${product.id.value}/images/${imageKeyToRemove}`,
        )
        .set("authorization", adminAuth());

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      const imageKeys = updatedProduct!.getImages().map((img) => img.getKey());
      expect(imageKeys).not.toContain(imageKeyToRemove);
    });

    test("when called with valid non-main image, it should persist ProductImageRemoved event to outbox", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        images: [
          File.create("key1", "name1", "https://example.com/key1", true),
          File.create("key2", "name2", "https://example.com/key2", false),
        ],
      });

      const secondaryImage = product.getImages().find((img) => !img.isMain());

      if (!secondaryImage) throw new Error("Non-main image not found");

      const imageKeyToRemove = secondaryImage.getKey();

      // Act
      await request
        .delete(
          `/api/v1/products/${product.id.value}/images/${imageKeyToRemove}`,
        )
        .set("authorization", adminAuth());

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.PRODUCT_IMAGE_REMOVED,
        product.id.value,
      );

      expect(event.payload).toMatchObject({
        aggregateId: expect.any(String),
        imageKey: imageKeyToRemove,
      });
    });

    test("when removing image, main image should remain unchanged", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        images: [
          File.create("key1", "name1", "https://example.com/key1", true),
          File.create("key2", "name2", "https://example.com/key2", false),
        ],
      });

      const mainImageKey = product.getMainImage().getKey();
      const secondaryImage = product.getImages().find((img) => !img.isMain())!;

      // Act
      await request
        .delete(
          `/api/v1/products/${product.id.value}/images/${secondaryImage.getKey()}`,
        )
        .set("authorization", adminAuth());

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
