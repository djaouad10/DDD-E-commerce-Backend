import type { Container } from "#/composition/container.js";
import { Color, Size } from "#/domain/entities/product.js";
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
import type { ProductVariationAdded } from "#/domain/events/product/product-variation-added.js";
import type { VariationCreated } from "#/domain/events/product/variation-created.js";
import { Variation } from "#/domain/entities/variation.js";
import { Weight } from "#/domain/value-objects/weight.js";

describe("POST /api/v1/products/:id/variations", () => {
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
    test("when called with valid data and product exists, it should return 200 with VariationSnapshot", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        customVariations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: 100,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: expect.any(String),
        size: Size.L,
        color: Color.BLUE,
        totalQty: 100,
        reservedQty: 0,
        availableQty: 100,
        isInStock: true,
        weightInGrams: {
          weight: 250,
          unit: "g",
        },
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    test("when product does not exist, it should return 404", async () => {
      // Arrange
      const variationData = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: 100,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${ProductId.generate().value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when called with invalid product id format, it should return 400", async () => {
      // Arrange
      const variationData = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: 100,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post("/api/v1/products/invalid-id/variations")
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with invalid size, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: "INVALID_SIZE",
        color: Color.BLUE,
        totalQty: 100,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with invalid color, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: Size.L,
        color: "INVALID_COLOR",
        totalQty: 100,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with negative totalQty, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: -10,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with zero totalQty, it should return 200", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        customVariations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: 0,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
    });

    test("when called with zero weightInGrams, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: 100,
        weightInGrams: 0,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with negative weightInGrams, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: 100,
        weightInGrams: -50,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when color + size combo already exists, it should return 409", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const existingVariation = product.getVariations()[0]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: existingVariation.getSize(),
        color: existingVariation.getColor(),
        totalQty: 100,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    });

    test("when client token is used (non-admin), it should return 403", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: 100,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
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

      const variationData = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: 100,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData);

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should add the variation to the product", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        customVariations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });
      const initialVariationCount = product.getVariations().length;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: 100,
        weightInGrams: 250,
      };

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getVariations()).toHaveLength(
        initialVariationCount + 1,
      );

      const addedVariation = updatedProduct!
        .getVariations()
        .find((v) => v.getSize() === Size.L && v.getColor() === Color.BLUE);
      expect(addedVariation).toBeDefined();
      expect(addedVariation!.getTotalQty()).toBe(100);
      expect(addedVariation!.getReservedQty()).toBe(0);
      expect(addedVariation!.getAvailableQty()).toBe(100);
      expect(addedVariation!.isInStock()).toBe(true);
      expect(addedVariation!.getWeight().weight).toBe(250);
      expect(addedVariation!.getWeight().unit).toBe("g");
    });

    test("when called with valid data, the new variation should have correct initial state", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        customVariations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: Size.XL,
        color: Color.GREEN,
        totalQty: 75,
        weightInGrams: 300,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.body).toEqual({
        id: expect.any(String),
        size: Size.XL,
        color: Color.GREEN,
        totalQty: 75,
        reservedQty: 0,
        availableQty: 75,
        isInStock: true,
        weightInGrams: {
          weight: 300,
          unit: "g",
        },
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    test("when called with totalQty > 0, the variation should be in stock", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        customVariations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: 50,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.body.isInStock).toBe(true);
      expect(response.body.availableQty).toBe(50);
    });

    test("when called with totalQty of 0, the variation should be out of stock", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        customVariations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: 0,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.totalQty).toBe(0);
      expect(response.body.isInStock).toBe(false);
    });

    test("when adding variation with same color but different size, it should succeed", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const existingVariation = product.getVariations()[0]!;
      const initialVariationCount = product.getVariations().length;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: Size.XL, // Different size
        color: existingVariation.getColor(), // Same color
        totalQty: 100,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);

      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);
      expect(updatedProduct!.getVariations()).toHaveLength(
        initialVariationCount + 1,
      );
    });

    test("when adding variation with same size but different color, it should succeed", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const existingVariation = product.getVariations()[0]!;
      const initialVariationCount = product.getVariations().length;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: existingVariation.getSize(), // Same size
        color: Color.BLUE, // Different color
        totalQty: 100,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);

      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);
      expect(updatedProduct!.getVariations()).toHaveLength(
        initialVariationCount + 1,
      );
    });
  });

  describe("Event Persistence", () => {
    test("when called with valid data, it should persist ProductVariationAdded event to outbox", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        customVariations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: 100,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const productVariationAddedEvent = events.find(
        (e) => e.eventType === DomainEventCode.PRODUCT_VARIATION_ADDED,
      );
      expect(productVariationAddedEvent).toBeDefined();
      expect(productVariationAddedEvent!.aggregateId).toBe(product.id.value);

      const payload = productVariationAddedEvent!
        .payload as ProductVariationAdded;
      expect(payload.variationId).toBe(response.body.id);
      expect(payload.size).toBe(Size.L);
      expect(payload.color).toBe(Color.BLUE);
    });

    test("when called with valid data, it should persist VariationCreated event to outbox", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        customVariations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: 100,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const variationCreatedEvent = events.find(
        (e) => e.eventType === DomainEventCode.VARIATION_CREATED,
      );
      expect(variationCreatedEvent).toBeDefined();
      expect(variationCreatedEvent!.aggregateId).toBe(product.id.value);

      const payload = variationCreatedEvent!.payload as VariationCreated;
      expect(payload.variationId).toBe(response.body.id);
      expect(payload.size).toBe(Size.L);
      expect(payload.color).toBe(Color.BLUE);
      expect(payload.totalQty).toBe(100);
      expect(payload.weightInGrams).toBe(250);
    });

    test("when called with valid data, it should persist both events to outbox", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        customVariations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: 100,
        weightInGrams: 250,
      };

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const eventTypes = events.map((e) => e.eventType);
      expect(eventTypes).toContain(DomainEventCode.PRODUCT_VARIATION_ADDED);
      expect(eventTypes).toContain(DomainEventCode.VARIATION_CREATED);

      const productVariationAddedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.PRODUCT_VARIATION_ADDED,
      );
      const variationCreatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.VARIATION_CREATED,
      );

      expect(productVariationAddedEvents).toHaveLength(1);
      expect(variationCreatedEvents).toHaveLength(1);
    });

    test("when adding multiple variations, each should have its own events", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        customVariations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData1 = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: 100,
        weightInGrams: 250,
      };

      const variationData2 = {
        size: Size.XL,
        color: Color.GREEN,
        totalQty: 80,
        weightInGrams: 300,
      };

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData1)
        .set("authorization", "Bearer test-admin-token");

      await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData2)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const productVariationAddedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.PRODUCT_VARIATION_ADDED,
      );
      const variationCreatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.VARIATION_CREATED,
      );

      expect(productVariationAddedEvents).toHaveLength(2);
      expect(variationCreatedEvents).toHaveLength(2);
    });
  });

  describe("Edge Cases", () => {
    test("when adding variation with very large totalQty, it should succeed", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        customVariations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: 999999,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.totalQty).toBe(999999);
      expect(response.body.availableQty).toBe(999999);
    });

    test("when adding variation with very small weightInGrams (1g), it should succeed", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        customVariations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: Size.L,
        color: Color.BLUE,
        totalQty: 100,
        weightInGrams: 1,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.weightInGrams.weight).toBe(1);
      expect(response.body.weightInGrams.unit).toBe("g");
    });

    test("when adding variation with same color + size combo, it should return 409 conflict with existing variation ID", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        customVariations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });
      const existingVariation = product.getVariations()[0]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const variationData = {
        size: existingVariation.getSize(),
        color: existingVariation.getColor(),
        totalQty: 100,
        weightInGrams: 250,
      };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(variationData)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    });
  });
});
