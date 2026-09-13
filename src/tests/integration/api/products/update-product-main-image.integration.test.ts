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
import { expectOutboxEvent } from "#/tests/helpers/outbox-assertions.js";

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

  const validBody = {
    key: "new-main-key",
    name: "new-main-name",
    publicUrl: "https://example.com/new-main.jpg",
  };

  describe("Response Validation", () => {
    test("when called with valid data, it should return 200 with success true", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}/images/main`)
        .send(validBody)
        .set("authorization", adminAuth());

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
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should update the product main image", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container);

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}/images/main`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getMainImage().getKey()).toBe(validBody.key);
      expect(updatedProduct!.getMainImage().getName()).toBe(validBody.name);
      expect(updatedProduct!.getMainImage().publicUrl).toBe(
        validBody.publicUrl,
      );
    });

    test("when called with valid data, it should remove the old main image from product images", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container);

      const oldMainImageKey = product.getMainImage().getKey();

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}/images/main`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      const imageKeys = updatedProduct!.getImages().map((img) => img.getKey());
      expect(imageKeys).not.toContain(oldMainImageKey);
      expect(imageKeys).toContain(validBody.key);
    });

    test("when called with valid data, only one image should be main", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container);

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}/images/main`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      const mainImages = updatedProduct!
        .getImages()
        .filter((img) => img.isMain());
      expect(mainImages).toHaveLength(1);
      expect(mainImages[0]!.getKey()).toBe(validBody.key);
    });

    test("when called with valid data, it should persist ProductMainImageUpdated event to outbox", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container);

      const oldMainImageKey = product.getMainImage().getKey();

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}/images/main`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.PRODUCT_MAIN_IMAGE_UPDATED,
        product.id.value,
      );

      expect(event.payload).toMatchObject({
        aggregateId: product.id.value,
        newMainImageKey: validBody.key,
        previousMainImageKey: oldMainImageKey,
      });
    });
  });
});
