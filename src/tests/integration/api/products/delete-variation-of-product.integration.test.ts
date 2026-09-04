import type { Container } from "#/composition/utils/container.js";
import { Category } from "#/domain/entities/category.js";
import { Color, Size } from "#/domain/entities/product.js";
import { Variation } from "#/domain/entities/variation.js";
import { Weight } from "#/domain/value-objects/weight.js";
import {
  clearDatabase,
  createCategoryInDB,
  createProductInDB,
  createUserInDB,
  setupOrderInDB,
} from "#/tests/helpers/db-helpers.js";
import {
  orderFactory,
  productFactory,
} from "#/tests/helpers/domain-helpers.js";
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
import { VariationId } from "#/domain/value-objects/variation-id.js";
import { User } from "#/domain/entities/user.js";
import { OrderItem } from "#/domain/entities/order-item.js";
import { Money } from "#/domain/value-objects/money.js";
import type { ProductVariationRemoved } from "#/domain/events/product/product-variation-removed.js";

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
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
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
        .delete(
          `/api/v1/products/${ProductId.generate().value}/variations/${variationId.value}`,
        )
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
        .delete(
          `/api/v1/products/${product.id.value}/variations/${nonExistentVariationId.value}`,
        )
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
        .delete(`/api/v1/products/invalid-id/variations/${variationId.value}`)
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
        .delete(`/api/v1/products/${product.id.value}/variations/invalid-id`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when variation is referenced by an existing order, it should return 409", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );

      const orderItem = OrderItem.create(
        variation.id,
        3,
        Money.of(100, "DZD"),
        Weight.of(100, "g"),
        null,
      );

      const order = orderFactory({
        orderItems: [orderItem],
        userId: user.id,
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);

      await setupOrderInDB(container, {
        owner: user,
        order,
      });

      // Act
      const response = await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("CONFLICT");
    });

    test("when trying to delete the last variation, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const singleVariation = Variation.create(
        Size.M,
        Color.RED,
        100,
        0,
        Weight.of(100, "g"),
      );
      const product = productFactory({
        categoryId: category.id,
        customVariations: [singleVariation],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${singleVariation.id.value}`,
        )
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
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
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
      const response = await request.delete(
        `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
      );

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should remove the variation from the product", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;
      const initialVariationCount = product.getVariations().length;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getVariations()).toHaveLength(
        initialVariationCount - 1,
      );

      const removedVariation = updatedProduct!
        .getVariations()
        .find((v) => v.id.equals(variation.id));
      expect(removedVariation).toBeUndefined();
    });

    test("when removing a variation, other variations should remain unchanged", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variationToRemove = product.getVariations()[0]!;
      const remainingVariation = product.getVariations()[1]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variationToRemove.id.value}`,
        )
        .set("authorization", "Bearer test-admin-token");

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
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const beforeUpdate = product.getUpdatedAt();

      // Act - Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getUpdatedAt().getTime()).toBeGreaterThan(
        beforeUpdate.getTime(),
      );
    });

    test("when deleting the last variation, the variation should NOT be removed and product should retain all variations", async () => {
      // Arrange
      const category = Category.create("Category");
      const singleVariation = Variation.create(
        Size.M,
        Color.RED,
        100,
        0,
        Weight.of(100, "g"),
      );
      const product = productFactory({
        categoryId: category.id,
        customVariations: [singleVariation],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${singleVariation.id.value}`,
        )
        .set("authorization", "Bearer test-admin-token")
        .expect(400);

      // Assert - Product should still have the variation
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getVariations()).toHaveLength(1);

      const stillExists = updatedProduct!
        .getVariations()
        .find((v) => v.id.equals(singleVariation.id));
      expect(stillExists).toBeDefined();
      expect(stillExists!.getSize()).toBe(singleVariation.getSize());
      expect(stillExists!.getColor()).toBe(singleVariation.getColor());
      expect(stillExists!.getTotalQty()).toBe(singleVariation.getTotalQty());
    });

    test("when deleting a variation that has reserved stock, it should still succeed (reserved stock doesn't block deletion)", async () => {
      // Arrange
      const category = Category.create("Category");
      const variation = Variation.create(
        Size.M,
        Color.RED,
        100,
        30, // 30 reserved
        Weight.of(100, "g"),
      );
      const product = productFactory({
        categoryId: category.id,
        customVariations: [
          variation,
          Variation.create(Size.L, Color.BLUE, 100, 0, Weight.of(100, "g")),
        ],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);

      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);
      expect(updatedProduct!.getVariations()).toHaveLength(1);
      const removedVariation = updatedProduct!
        .getVariations()
        .find((v) => v.id.equals(variation.id));
      expect(removedVariation).toBeUndefined();
    });
  });

  describe("Event Persistence", () => {
    test("when called with valid data, it should persist ProductVariationRemoved event to outbox", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const productVariationRemovedEvent = events.find(
        (e) => e.eventType === DomainEventCode.PRODUCT_VARIATION_REMOVED,
      );
      expect(productVariationRemovedEvent).toBeDefined();
      expect(productVariationRemovedEvent!.aggregateId).toBe(product.id.value);

      const payload = productVariationRemovedEvent!
        .payload as ProductVariationRemoved;
      expect(payload.variationId).toBe(variation.id.value);
    });

    test("when removing multiple variations, each should have its own ProductVariationRemoved event", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation1 = product.getVariations()[0]!;
      const variation2 = product.getVariations()[1]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act - Remove first variation
      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation1.id.value}`,
        )
        .set("authorization", "Bearer test-admin-token");

      // Act - Remove second variation
      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation2.id.value}`,
        )
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const productVariationRemovedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.PRODUCT_VARIATION_REMOVED,
      );
      expect(productVariationRemovedEvents).toHaveLength(2);

      const variationIds = productVariationRemovedEvents.map(
        (e) => (e.payload as ProductVariationRemoved).variationId,
      );
      expect(variationIds).toContain(variation1.id.value);
      expect(variationIds).toContain(variation2.id.value);
    });

    test("when variation is not removed due to order reference, no ProductVariationRemoved event should be persisted", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );

      const orderItem = OrderItem.create(
        variation.id,
        3,
        Money.of(100, "DZD"),
        Weight.of(100, "g"),
        null,
      );

      const order = orderFactory({
        orderItems: [orderItem],
        userId: user.id,
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);
      await createUserInDB(container, user);

      await setupOrderInDB(container, {
        owner: user,
        order,
      });

      // Act - Try to delete (will fail with 409)
      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .set("authorization", "Bearer test-admin-token")
        .expect(409);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const productVariationRemovedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.PRODUCT_VARIATION_REMOVED,
      );
      expect(productVariationRemovedEvents).toHaveLength(0);
    });

    test("when trying to delete the last variation, no ProductVariationRemoved event should be persisted", async () => {
      // Arrange
      const category = Category.create("Category");
      const singleVariation = Variation.create(
        Size.M,
        Color.RED,
        100,
        0,
        Weight.of(100, "g"),
      );
      const product = productFactory({
        categoryId: category.id,
        customVariations: [singleVariation],
      });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act - Try to delete the last variation (will fail with 400)
      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${singleVariation.id.value}`,
        )
        .set("authorization", "Bearer test-admin-token")
        .expect(400);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const productVariationRemovedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.PRODUCT_VARIATION_REMOVED,
      );
      expect(productVariationRemovedEvents).toHaveLength(0);
    });

    test("when called with valid data, exactly one ProductVariationRemoved event should be persisted", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      const variation = product.getVariations()[0]!;

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .delete(
          `/api/v1/products/${product.id.value}/variations/${variation.id.value}`,
        )
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const productVariationRemovedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.PRODUCT_VARIATION_REMOVED,
      );
      expect(productVariationRemovedEvents).toHaveLength(1);
    });
  });
});
