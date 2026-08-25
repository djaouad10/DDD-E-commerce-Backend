// tests/integration/api/products/update-variation-of-product.integration.test.ts

import type { Container } from "#/composition/container.js";
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
import { PRODUCT_REPOSITORY, OUTBOX_REPOSITORY } from "#/composition/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { VariationId } from "#/domain/value-objects/variation-id.js";
import type { VariationStockUpdated } from "#/domain/events/product/variation-stock-updated.js";
import type { VariationWeightUpdated } from "#/domain/events/product/variation-weight-updated.js";

describe("PATCH /api/v1/products/:productId/variations/:variationId", () => {
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
    test("when called with valid data and product exists, it should return 200 with success true", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newTotalQty: 150,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with newWeightInGrams only, it should return 200", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newWeightInGrams: 250,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with both newTotalQty and newWeightInGrams, it should return 200", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newTotalQty: 200,
          newWeightInGrams: 300,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when product does not exist, it should return 404", async () => {
      // Arrange
      const variationId = VariationId.generate();

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${ProductId.generate().value}/variations/${variationId.value}`,
        )
        .send({
          newTotalQty: 150,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when variation does not exist, it should return 404", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const nonExistentVariationId = VariationId.generate();

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${nonExistentVariationId.value}`,
        )
        .send({
          newTotalQty: 150,
        })
        .set("authorization", "Bearer test-admin-token");

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
        .set("authorization", "Bearer test-admin-token");

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
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with negative newTotalQty, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newTotalQty: -10,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with zero newWeightInGrams, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newWeightInGrams: 0,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with negative newWeightInGrams, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newWeightInGrams: -50,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when newTotalQty is less than reserved qty, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      // Create a variation with totalQty: 100, reservedQty: 0
      const variation = Variation.create(
        Size.M,
        Color.RED,
        100,
        0,
        Weight.of(100, "g"),
      );
      const product = productFactory({
        categoryId: category.id,
        customVariations: [variation],
      });

      // Reserve 30 units
      variation.reserve(30);

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act - Try to set totalQty to 20 (less than reserved 30)
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newTotalQty: 20,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when client token is used (non-admin), it should return 403", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newTotalQty: 150,
        })
        .set("authorization", "Bearer test-client-token");

      // Assert
      expect(response.status).toBe(403);
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
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
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;
      const originalTotalQty = variation.getTotalQty();
      const newTotalQty = originalTotalQty + 50;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newTotalQty,
        })
        .set("authorization", "Bearer test-admin-token");

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
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;
      const originalAvailableQty = variation.getAvailableQty();
      const newTotalQty = variation.getTotalQty() + 50;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newTotalQty,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      const updatedVariation = updatedProduct!
        .getVariations()
        .find((v) => v.id.equals(variation.id))!;

      expect(updatedVariation.getAvailableQty()).toBe(
        originalAvailableQty + 50,
      );
    });

    test("when newTotalQty is set, isInStock should update correctly", async () => {
      // Arrange
      const category = Category.create("Category");
      const variation = Variation.create(
        Size.M,
        Color.RED,
        10,
        0,
        Weight.of(100, "g"),
      );
      const product = productFactory({
        categoryId: category.id,
        customVariations: [variation],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act - Set totalQty to 0 (out of stock)
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newTotalQty: 0,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      const updatedVariation = updatedProduct!
        .getVariations()
        .find((v) => v.id.equals(variation.id))!;

      expect(updatedVariation.getTotalQty()).toBe(0);
      expect(updatedVariation.getAvailableQty()).toBe(0);
      expect(updatedVariation.isInStock()).toBe(false);
    });
  });

  describe("New State Validation - Update Weight", () => {
    test("when called with newWeightInGrams, it should update the variation weight", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;
      const originalWeight = variation.getWeight();
      const newWeightInGrams = originalWeight.weight + 50;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newWeightInGrams,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      const updatedVariation = updatedProduct!
        .getVariations()
        .find((v) => v.id.equals(variation.id))!;

      expect(updatedVariation.getWeight().weight).toBe(newWeightInGrams);
      expect(updatedVariation.getWeight().unit).toBe("g");
    });
  });

  describe("New State Validation - Update Both", () => {
    test("when called with both newTotalQty and newWeightInGrams, it should update both", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;
      const newTotalQty = variation.getTotalQty() + 100;
      const newWeightInGrams = variation.getWeight().weight + 50;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newTotalQty,
          newWeightInGrams,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      const updatedVariation = updatedProduct!
        .getVariations()
        .find((v) => v.id.equals(variation.id))!;

      expect(updatedVariation.getTotalQty()).toBe(newTotalQty);
      expect(updatedVariation.getWeight().weight).toBe(newWeightInGrams);
    });
  });

  describe("Event Persistence", () => {
    test("when called with newTotalQty, it should persist VariationStockUpdated event to outbox", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;
      const prevTotalQty = variation.getTotalQty();
      const newTotalQty = prevTotalQty + 50;
      const prevAvailableQty = variation.getAvailableQty();

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newTotalQty,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const stockUpdatedEvent = events.find(
        (e) => e.eventType === DomainEventCode.VARIATION_STOCK_UPDATED,
      );
      expect(stockUpdatedEvent).toBeDefined();
      expect(stockUpdatedEvent!.aggregateId).toBe(product.id.value);

      const payload = stockUpdatedEvent!.payload as VariationStockUpdated;
      expect(payload.variationId).toBe(variation.id.value);
      expect(payload.previousTotalQty).toBe(prevTotalQty);
      expect(payload.newTotalQty).toBe(newTotalQty);
      expect(payload.newAvailableQty).toBe(prevAvailableQty + 50);
    });

    test("when called with newWeightInGrams, it should persist VariationWeightUpdated event to outbox", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;
      const prevWeight = variation.getWeight().weight;
      const newWeightInGrams = prevWeight + 50;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newWeightInGrams,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const weightUpdatedEvent = events.find(
        (e) => e.eventType === DomainEventCode.VARIATION_WEIGHT_UPDATED,
      );
      expect(weightUpdatedEvent).toBeDefined();
      expect(weightUpdatedEvent!.aggregateId).toBe(product.id.value);

      const payload = weightUpdatedEvent!.payload as VariationWeightUpdated;
      expect(payload.variationId).toBe(variation.id.value);
      expect(payload.previousWeightInGrams).toBe(prevWeight);
      expect(payload.newWeightInGrams).toBe(newWeightInGrams);
    });

    test("when called with both newTotalQty and newWeightInGrams, it should persist both events", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;
      const newTotalQty = variation.getTotalQty() + 50;
      const newWeightInGrams = variation.getWeight().weight + 50;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newTotalQty,
          newWeightInGrams,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const eventTypes = events.map((e) => e.eventType);
      expect(eventTypes).toContain(DomainEventCode.VARIATION_STOCK_UPDATED);
      expect(eventTypes).toContain(DomainEventCode.VARIATION_WEIGHT_UPDATED);

      const stockUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.VARIATION_STOCK_UPDATED,
      );
      const weightUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.VARIATION_WEIGHT_UPDATED,
      );

      expect(stockUpdatedEvents).toHaveLength(1);
      expect(weightUpdatedEvents).toHaveLength(1);
    });

    test("when only newWeightInGrams is provided, no stock event should be emitted", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newWeightInGrams: 250,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const stockUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.VARIATION_STOCK_UPDATED,
      );
      expect(stockUpdatedEvents).toHaveLength(0);

      const weightUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.VARIATION_WEIGHT_UPDATED,
      );
      expect(weightUpdatedEvents).toHaveLength(1);
    });

    test("when only newTotalQty is provided, no weight event should be emitted", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newTotalQty: 150,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const stockUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.VARIATION_STOCK_UPDATED,
      );
      expect(stockUpdatedEvents).toHaveLength(1);

      const weightUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.VARIATION_WEIGHT_UPDATED,
      );
      expect(weightUpdatedEvents).toHaveLength(0);
    });
  });

  describe("Edge Cases", () => {
    test("when updating quantity to the same value, it should succeed but not emit an event", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;
      const currentTotalQty = variation.getTotalQty();

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newTotalQty: currentTotalQty,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);

      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const stockUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.VARIATION_STOCK_UPDATED,
      );
      expect(stockUpdatedEvents).toHaveLength(0);
    });

    test("when updating weight to the same value, it should succeed and not emit an event", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;
      const currentWeight = variation.getWeight().weight;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newWeightInGrams: currentWeight,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);

      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const weightUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.VARIATION_WEIGHT_UPDATED,
      );
      expect(weightUpdatedEvents).toHaveLength(0);
    });

    test("when variation has reserved stock, newTotalQty must be >= reservedQty", async () => {
      // Arrange
      const category = Category.create("Category");
      const variation = Variation.create(
        Size.M,
        Color.RED,
        100,
        0,
        Weight.of(100, "g"),
      );
      const product = productFactory({
        categoryId: category.id,
        customVariations: [variation],
      });

      // Reserve 40 units
      variation.reserve(40);

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act - Try to set totalQty to 30 (less than reserved 40)
      const response = await request
        .patch(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .send({
          newTotalQty: 30,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");

      // Verify quantity wasn't changed
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);
      const updatedVariation = updatedProduct!
        .getVariations()
        .find((v) => v.id.equals(variation.id))!;

      expect(updatedVariation.getTotalQty()).toBe(100); // Unchanged
      expect(updatedVariation.getReservedQty()).toBe(40);
    });
  });
});
