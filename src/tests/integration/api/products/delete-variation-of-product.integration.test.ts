import type { Container } from "#/composition/utils/container.js";
import { Color, Size } from "#/domain/entities/product.js";
import { Variation } from "#/domain/entities/variation.js";
import { Weight } from "#/domain/value-objects/weight.js";
import { clearDatabase } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { PRODUCT_REPOSITORY } from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { VariationId } from "#/domain/value-objects/variation-id.js";
import { adminAuth, clientAuth } from "#/tests/helpers/auth-helpers.js";
import { setupProductAndUserInDB } from "#/tests/helpers/cart-helpers.js";
import { setupOrderWithReservedStock } from "#/tests/helpers/order-helpers.js";
import { setupProductAndCategory } from "#/tests/helpers/product-helpers.js";
import {
  expectOutboxEvent,
  expectOutboxEventCount,
} from "#/tests/helpers/outbox-assertions.js";

describe("DELETE /api/v1/products/:productId/variations/:variationId", () => {
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
    test("when called with valid data and variation exists, it should return 200 with success true", async () => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when product does not exist, it should return 404", async () => {
      // Arrange
      const { variation1 } = await setupProductAndUserInDB(container);
      const productId = ProductId.generate();

      // Act
      const response = await request
        .delete(
          `/api/v1/products/${productId.value}/variations/${variation1.id.value}`,
        )
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when variation does not exist, it should return 404", async () => {
      // Arrange
      const { product } = await setupProductAndUserInDB(container);
      const nonExistentVariationId = VariationId.generate();

      // Act
      const response = await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${nonExistentVariationId.value}`,
        )
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when called with invalid product id format, it should return 400", async () => {
      // Arrange
      const { variation1 } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .delete(`/api/v1/products/invalid-id/variations/${variation1.id.value}`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with invalid variation id format, it should return 400", async () => {
      // Arrange
      const { product } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .delete(`/api/v1/products/${product.id.value}/variations/invalid-id`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when variation is referenced by an existing order, it should return 409", async () => {
      // Arrange
      const { product, variation1 } = await setupOrderWithReservedStock(
        container,
        1,
      );

      // Act
      const response = await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    });

    test("when trying to delete the last variation, it should return 400", async () => {
      // Arrange
      const variationId = VariationId.generate();

      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.reconstitute(
            variationId,
            Size.M,
            Color.RED,
            40,
            49,
            Weight.of(100, "g"),
            new Date(),
            new Date(),
          ),
        ],
      });

      // Act
      const response = await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variationId.value}`,
        )
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when client token is used (non-admin), it should return 403", async () => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .set("authorization", clientAuth());

      // Assert
      expect(response.status).toBe(403);
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);

      // Act
      const response = await request.delete(
        `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
      );

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should remove the variation from the product", async () => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);
      const initialVariationCount = product.getVariations().length;

      // Act
      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .set("authorization", adminAuth());

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getVariations()).toHaveLength(
        initialVariationCount - 1,
      );

      const removedVariation = updatedProduct!
        .getVariations()
        .find((v) => v.id.equals(variation1.id));
      expect(removedVariation).toBeUndefined();
    });

    test("when removing a variation, other variations should remain unchanged", async () => {
      // Arrange
      const { product, variation1, variation2 } =
        await setupProductAndUserInDB(container);

      const variationToRemove = variation1;
      const remainingVariation = variation2;

      // Act
      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variationToRemove.id.value}`,
        )
        .set("authorization", adminAuth());

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();

      const stillExists = updatedProduct!
        .getVariations()
        .find((v) => v.id.equals(remainingVariation.id));
      expect(stillExists).toBeDefined();
      expect(stillExists!.getSize()).toBe(remainingVariation.getSize());
      expect(stillExists!.getColor()).toBe(remainingVariation.getColor());
      expect(stillExists!.getTotalQty()).toBe(remainingVariation.getTotalQty());
    });

    test("when called with valid data, it should update the product's updatedAt timestamp", async () => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);

      const beforeUpdate = product.getUpdatedAt();

      // Act - Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .set("authorization", adminAuth());

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getUpdatedAt().getTime()).toBeGreaterThan(
        beforeUpdate.getTime(),
      );
    });
  });

  describe("Event Persistence", () => {
    test("when called with valid data, it should persist ProductVariationRemoved event to outbox", async () => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);

      // Act
      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .set("authorization", adminAuth());

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.PRODUCT_VARIATION_REMOVED,
        product.id.value,
      );

      expect(event.payload).toMatchObject({
        aggregateId: product.id.value,
        variationId: variation1.id.value,
      });
    });

    test("when removing multiple variations, each should have its own ProductVariationRemoved event", async () => {
      // Arrange
      const variationId1 = VariationId.generate();
      const variationId2 = VariationId.generate();
      const variationId3 = VariationId.generate();

      // we create the product with 3 variations so when we remove 2 of them, we have 1 left
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.reconstitute(
            variationId1,
            Size.M,
            Color.RED,
            40,
            49,
            Weight.of(100, "g"),
            new Date(),
            new Date(),
          ),
          Variation.reconstitute(
            variationId2,
            Size.EU_36,
            Color.RED,
            40,
            49,
            Weight.of(100, "g"),
            new Date(),
            new Date(),
          ),
          Variation.reconstitute(
            variationId3,
            Size.EU_36,
            Color.GRAY,
            40,
            49,
            Weight.of(100, "g"),
            new Date(),
            new Date(),
          ),
        ],
      });

      // Act - Remove first variation
      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variationId1.value}`,
        )
        .set("authorization", adminAuth());

      // Act - Remove second variation
      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variationId2.value}`,
        )
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.PRODUCT_VARIATION_REMOVED,
        2,
      );
    });

    test("when variation is not removed due to order reference, no ProductVariationRemoved event should be persisted", async () => {
      // Arrange
      const { product, variation1 } = await setupOrderWithReservedStock(
        container,
        3,
      );

      // Act - Try to delete (will fail with 409)
      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .set("authorization", adminAuth())
        .expect(409);

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.PRODUCT_VARIATION_REMOVED,
        0,
      );
    });

    test("when trying to delete the last variation, no ProductVariationRemoved event should be persisted", async () => {
      // Arrange
      const variationId = VariationId.generate();
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.reconstitute(
            variationId,
            Size.M,
            Color.RED,
            40,
            49,
            Weight.of(100, "g"),
            new Date(),
            new Date(),
          ),
        ],
      });

      // Act - Try to delete the last variation (will fail with 400)
      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variationId.value}`,
        )
        .set("authorization", adminAuth())
        .expect(400);

      // Assert

      await expectOutboxEventCount(
        container,
        DomainEventCode.PRODUCT_VARIATION_REMOVED,
        0,
      );
    });

    test("when called with valid data, exactly one ProductVariationRemoved event should be persisted", async () => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);

      // Act
      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.PRODUCT_VARIATION_REMOVED,
        1,
      );
    });
  });
});
