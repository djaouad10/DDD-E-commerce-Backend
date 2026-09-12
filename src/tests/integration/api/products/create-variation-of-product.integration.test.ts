import type { Container } from "#/composition/utils/container.js";
import { Color, Size } from "#/domain/entities/product.js";
import { clearDatabase } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { PRODUCT_REPOSITORY } from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import { Variation } from "#/domain/entities/variation.js";
import { Weight } from "#/domain/value-objects/weight.js";
import { adminAuth, clientAuth } from "#/tests/helpers/auth-helpers.js";
import { setupProductAndCategory } from "#/tests/helpers/product-helpers.js";
import {
  expectOutboxEvent,
  expectOutboxEventCount,
} from "#/tests/helpers/outbox-assertions.js";

describe("POST /api/v1/products/:id/variations", () => {
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
    size: Size.L,
    color: Color.BLUE,
    totalQty: 100,
    weightInGrams: 250,
  };

  describe("Response Validation", () => {
    test("when called with valid data and product exists, it should return 200 with VariationSnapshot", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: expect.any(String),
        size: validBody.size,
        color: validBody.color,
        totalQty: validBody.totalQty,
        reservedQty: 0,
        availableQty: 100,
        isInStock: true,
        weightInGrams: {
          weight: validBody.weightInGrams,
          unit: "g",
        },
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    test("when product does not exist, it should return 404", async () => {
      // Act
      const response = await request
        .post(`/api/v1/products/${ProductId.generate().value}/variations`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when called with invalid product id format, it should return 400", async () => {
      // Act
      const response = await request
        .post("/api/v1/products/invalid-id/variations")
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test.each([
      ["invalid size", { ...validBody, size: "INVALID_SIZE" }],
      ["invalid color", { ...validBody, color: "INVALID_COLOR" }],
      ["negative totalQty", { ...validBody, totalQty: -10 }],
      ["negative weightInGrams", { ...validBody, weightInGrams: -100 }],
      ["zero weightInGrams", { ...validBody, weightInGrams: 0 }],
    ])("when called with %s, it should return 400", async (_, body) => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with zero totalQty, it should return 200", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      const body = { ...validBody, totalQty: 0 };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
    });

    test("when color + size combo already exists, it should return 409", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      const body = { ...validBody, size: Size.M, color: Color.RED };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    });

    test("when client token is used (non-admin), it should return 403", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(validBody)
        .set("authorization", clientAuth());

      // Assert
      expect(response.status).toBe(403);
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(validBody);

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should add the variation to the product", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      const initialVariationCount = product.getVariations().length;

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getVariations()).toHaveLength(
        initialVariationCount + 1,
      );

      const addedVariation = updatedProduct!
        .getVariations()
        .find(
          (v) =>
            v.getSize() === validBody.size && v.getColor() === validBody.color,
        );
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
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      expect(response.body).toEqual({
        id: expect.any(String),
        size: validBody.size,
        color: validBody.color,
        totalQty: validBody.totalQty,
        reservedQty: 0,
        availableQty: validBody.totalQty,
        isInStock: true,
        weightInGrams: {
          weight: validBody.weightInGrams,
          unit: "g",
        },
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    test("when called with totalQty > 0, the variation should be in stock", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      const body = { ...validBody, totalQty: 50 };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      expect(response.body.isInStock).toBe(true);
      expect(response.body.availableQty).toBe(50);
    });

    test("when called with totalQty of 0, the variation should be out of stock", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      const body = { ...validBody, totalQty: 0 };

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.totalQty).toBe(0);
      expect(response.body.isInStock).toBe(false);
    });

    test("when adding variation with same color but different size, it should succeed", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      const body = { ...validBody, size: Size.L, color: Color.RED };

      const initialVariationCount = product.getVariations().length;

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(body)
        .set("authorization", adminAuth());

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
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      const body = { ...validBody, size: Size.M, color: Color.BLUE };

      const initialVariationCount = product.getVariations().length;

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(body)
        .set("authorization", adminAuth());

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
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.PRODUCT_VARIATION_ADDED,
        product.id.value,
      );

      expect(event.payload).toMatchObject({
        aggregateId: product.id.value,
        variationId: response.body.id,
        size: validBody.size,
        color: validBody.color,
      });
    });

    test("when called with valid data, it should persist VariationCreated event to outbox", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.VARIATION_CREATED,
        product.id.value,
      );

      expect(event.payload).toMatchObject({
        aggregateId: product.id.value,
        variationId: response.body.id,
        size: validBody.size,
        color: validBody.color,
        totalQty: validBody.totalQty,
        weightInGrams: validBody.weightInGrams,
      });
    });

    test("when called with valid data, it should persist both events to outbox", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send(validBody)
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEvent(
        container,
        DomainEventCode.PRODUCT_VARIATION_ADDED,
        product.id.value,
      );

      await expectOutboxEvent(
        container,
        DomainEventCode.VARIATION_CREATED,
        product.id.value,
      );
    });

    test("when adding multiple variations, each should have its own events", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      // Act
      await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send({ ...validBody, color: Color.BLUE, size: Size.L })
        .set("authorization", adminAuth());

      await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send({ ...validBody, color: Color.GREEN, size: Size.XL })
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.PRODUCT_VARIATION_ADDED,
        2,
      );

      await expectOutboxEventCount(
        container,
        DomainEventCode.VARIATION_CREATED,
        2,
      );
    });
  });

  describe("Edge Cases", () => {
    test("when adding variation with very large totalQty, it should succeed", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      const qty = 999999;

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send({
          ...validBody,
          totalQty: qty,
        })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.totalQty).toBe(qty);
      expect(response.body.availableQty).toBe(qty);
    });

    test("when adding variation with very small weightInGrams (1g), it should succeed", async () => {
      // Arrange
      const { product } = await setupProductAndCategory(container, {
        variations: [
          Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
        ],
      });

      const weight = 1;

      // Act
      const response = await request
        .post(`/api/v1/products/${product.id.value}/variations`)
        .send({
          ...validBody,
          weightInGrams: weight,
        })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.weightInGrams.weight).toBe(weight);
      expect(response.body.weightInGrams.unit).toBe("g");
    });
  });
});
