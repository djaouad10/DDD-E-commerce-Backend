import type { Container } from "#/composition/utils/container.js";
import { Category } from "#/domain/entities/category.js";
import { Color, Size } from "#/domain/entities/product.js";
import { Variation } from "#/domain/entities/variation.js";
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
import { PRODUCT_REPOSITORY } from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { VariationId } from "#/domain/value-objects/variation-id.js";
import { adminAuth, clientAuth } from "#/tests/helpers/auth-helpers.js";
import { setupProductAndUserInDB } from "#/tests/helpers/cart-helpers.js";
import { setupProductAndCategory } from "#/tests/helpers/product-helpers.js";
import {
  expectNoOutboxEvent,
  expectOutboxEvent,
} from "#/tests/helpers/outbox-assertions.js";

describe("PATCH /api/v1/products/:productId/variations/:variationId", () => {
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
      const { product, variation1 } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .send({
          newTotalQty: 150,
        })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with newWeightInGrams only, it should return 200", async () => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .send({
          newWeightInGrams: 250,
        })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with both newTotalQty and newWeightInGrams, it should return 200", async () => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .send({
          newTotalQty: 200,
          newWeightInGrams: 300,
        })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when product does not exist, it should return 404", async () => {
      // Arrange
      const { variation1 } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${ProductId.generate().value}/variations/${variation1.id.value}`,
        )
        .send({
          newTotalQty: 150,
        })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when variation does not exist, it should return 404", async () => {
      // Arrange
      const { product } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${VariationId.generate().value}`,
        )
        .send({
          newTotalQty: 150,
        })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when called with invalid product id format, it should return 400", async () => {
      // Arrange
      const variationId = VariationId.generate();

      // Act
      const response = await request
        .patch(`/api/v1/products/invalid-id/variations/${variationId.value}`)
        .send({
          newTotalQty: 150,
        })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with invalid variation id format, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}/variations/invalid-id`)
        .send({
          newTotalQty: 150,
        })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test.each([
      ["negative newTotalQty", { newTotalQty: -10 }],
      ["negative newWeightInGrams", { newWeightInGrams: -10 }],
      ["zero newWeightInGrams", { newWeightInGrams: 0 }],
    ])("when called with %s, it should return 400", async (_, body) => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when newTotalQty is less than reserved qty, it should return 400", async () => {
      // Arrange
      const variationId = VariationId.generate();
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.reconstitute(
            variationId,
            Size.M,
            Color.RED,
            40,
            30,
            Weight.of(100, "g"),
            new Date(),
            new Date(),
          ),
        ],
      });

      // Act - Try to set totalQty to 20 (less than reserved 30)
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variationId.value}`,
        )
        .send({
          newTotalQty: 20,
        })
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
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .send({
          newTotalQty: 150,
        })
        .set("authorization", clientAuth());

      // Assert
      expect(response.status).toBe(403);
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .send({
          newTotalQty: 150,
        });

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe("New State Validation - Update Total Quantity", () => {
    test("when called with newTotalQty, it should update the variation total quantity", async () => {
      // Arrange
      const variationId = VariationId.generate();
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.reconstitute(
            variationId,
            Size.M,
            Color.RED,
            40,
            30,
            Weight.of(100, "g"),
            new Date(),
            new Date(),
          ),
        ],
      });

      const variation = product.getVariation(variationId)!;
      const originalTotalQty = variation.getTotalQty();
      const newTotalQty = originalTotalQty + 50;

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variationId.value}`,
        )
        .send({
          newTotalQty,
        })
        .set("authorization", adminAuth());

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      const updatedVariation = updatedProduct!
        .getVariations()
        .find((v) => v.id.equals(variation.id))!;

      expect(updatedVariation.getTotalQty()).toBe(newTotalQty);
    });

    test("when newTotalQty increases, available quantity should increase accordingly", async () => {
      // Arrange
      const variationId = VariationId.generate();
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.reconstitute(
            variationId,
            Size.M,
            Color.RED,
            40,
            30,
            Weight.of(100, "g"),
            new Date(),
            new Date(),
          ),
        ],
      });

      const variation = product.getVariation(variationId)!;
      const originalAvailableQty = variation.getAvailableQty();
      const newTotalQty = variation.getTotalQty() + 50;

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newTotalQty,
        })
        .set("authorization", adminAuth());

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      const updatedVariation = updatedProduct!.getVariation(variation.id)!;

      expect(updatedVariation.getAvailableQty()).toBe(
        originalAvailableQty + 50,
      );
    });

    test("when newTotalQty is set, isInStock should update correctly", async () => {
      // Arrange
      const variationId = VariationId.generate();
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.reconstitute(
            variationId,
            Size.M,
            Color.RED,
            40,
            30,
            Weight.of(100, "g"),
            new Date(),
            new Date(),
          ),
        ],
      });

      // Act - Set totalQty to reserved quantity (out of stock)
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variationId.value}`,
        )
        .send({
          newTotalQty: 30,
        })
        .set("authorization", adminAuth());

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      const updatedVariation = updatedProduct!.getVariation(variationId)!;

      expect(updatedVariation.getTotalQty()).toBe(30);
      expect(updatedVariation.getAvailableQty()).toBe(0);
      expect(updatedVariation.isInStock()).toBe(false);
    });
  });

  describe("New State Validation - Update Weight", () => {
    test("when called with newWeightInGrams, it should update the variation weight", async () => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);
      const originalWeightInGrams = variation1.getWeight().weight;
      const newWeightInGrams = originalWeightInGrams + 100;

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .send({
          newWeightInGrams,
        })
        .set("authorization", adminAuth());

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      const updatedVariation = updatedProduct!
        .getVariations()
        .find((v) => v.id.equals(variation1.id))!;

      expect(updatedVariation.getWeight().weight).toBe(newWeightInGrams);
      expect(updatedVariation.getWeight().unit).toBe("g");
    });
  });

  describe("New State Validation - Update Both", () => {
    test("when called with both newTotalQty and newWeightInGrams, it should update both", async () => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);
      const originalWeightInGrams = variation1.getWeight().weight;
      const newWeightInGrams = originalWeightInGrams + 100;
      const originalTotalQty = variation1.getTotalQty();
      const newTotalQty = originalTotalQty + 50;

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .send({
          newTotalQty,
          newWeightInGrams,
        })
        .set("authorization", adminAuth());

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      const updatedVariation = updatedProduct!
        .getVariations()
        .find((v) => v.id.equals(variation1.id))!;

      expect(updatedVariation.getTotalQty()).toBe(newTotalQty);
      expect(updatedVariation.getWeight().weight).toBe(newWeightInGrams);
    });
  });

  describe("Event Persistence", () => {
    test("when called with newTotalQty, it should persist VariationStockUpdated event to outbox", async () => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);

      const prevTotalQty = variation1.getTotalQty();
      const prevAvailableQty = variation1.getAvailableQty();
      const newTotalQty = variation1.getTotalQty() + 50;

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .send({
          newTotalQty,
        })
        .set("authorization", adminAuth());

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.VARIATION_STOCK_UPDATED,
        product.id.value,
      );

      expect(event.payload).toMatchObject({
        aggregateId: product.id.value,
        variationId: variation1.id.value,
        previousTotalQty: prevTotalQty,
        newTotalQty,
        newAvailableQty: prevAvailableQty + 50,
      });
    });

    test("when called with newWeightInGrams, it should persist VariationWeightUpdated event to outbox", async () => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);
      const prevWeight = variation1.getWeight().weight;
      const newWeightInGrams = prevWeight + 100;

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .send({
          newWeightInGrams,
        })
        .set("authorization", adminAuth());

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.VARIATION_WEIGHT_UPDATED,
        product.id.value,
      );

      expect(event.payload).toMatchObject({
        aggregateId: product.id.value,
        variationId: variation1.id.value,
        previousWeightInGrams: prevWeight,
        newWeightInGrams: newWeightInGrams,
      });
    });

    test("when called with both newTotalQty and newWeightInGrams, it should persist both events", async () => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);

      const newTotalQty = variation1.getTotalQty() + 50;
      const prevWeight = variation1.getWeight().weight;
      const newWeightInGrams = prevWeight + 100;

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .send({
          newTotalQty,
          newWeightInGrams,
        })
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEvent(
        container,
        DomainEventCode.VARIATION_STOCK_UPDATED,
        product.id.value,
      );

      await expectOutboxEvent(
        container,
        DomainEventCode.VARIATION_WEIGHT_UPDATED,
        product.id.value,
      );
    });
  });

  describe("Edge Cases", () => {
    test("when updating quantity to the same value, it should succeed but not emit an event", async () => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);
      const currentTotalQty = variation1.getTotalQty();

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .send({
          newTotalQty: currentTotalQty,
        })
        .set("authorization", adminAuth());

      // Assert
      expectNoOutboxEvent(container, DomainEventCode.VARIATION_STOCK_UPDATED);
    });

    test("when updating weight to the same value, it should succeed and not emit an event", async () => {
      // Arrange
      const { product, variation1 } = await setupProductAndUserInDB(container);
      const currentWeight = variation1.getWeight().weight;

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .send({
          newWeightInGrams: currentWeight,
        })
        .set("authorization", adminAuth());

      // Assert
      expectNoOutboxEvent(container, DomainEventCode.VARIATION_WEIGHT_UPDATED);
    });
  });
});
