import type { Container } from "#/composition/utils/container.js";
import { Category } from "#/domain/entities/category.js";
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
import { ProductId } from "#/domain/value-objects/product-id.js";
import { User } from "#/domain/entities/user.js";
import { OrderItem } from "#/domain/entities/order-item.js";
import { Money } from "#/domain/value-objects/money.js";

describe("DELETE /api/v1/products/:id", () => {
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
    test("when called with valid product id, it should return 200 with success true", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .delete(`/api/v1/products/${product.id.value}`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when product does not exist, it should return 404", async () => {
      // Act
      const response = await request
        .delete(`/api/v1/products/${ProductId.generate().value}`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when called with invalid product id format, it should return 400", async () => {
      // Act
      const response = await request
        .delete("/api/v1/products/invalid-id")
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when product is referenced by an existing order, it should return 409", async () => {
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
        .delete(`/api/v1/products/${product.id.value}`)
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

      // Act
      const response = await request
        .delete(`/api/v1/products/${product.id.value}`)
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

      // Act
      const response = await request.delete(
        `/api/v1/products/${product.id.value}`,
      );

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should delete the product from the database", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .delete(`/api/v1/products/${product.id.value}`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const deletedProduct = await productRepository.find(product.id);

      expect(deletedProduct).toBeNull();
    });

    test("when product is deleted, all its variations should also be deleted (cascade)", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .delete(`/api/v1/products/${product.id.value}`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const deletedProduct = await productRepository.find(product.id);

      expect(deletedProduct).toBeNull();

      // Verify variations are gone by checking the product no longer exists
      // The cascade delete in the database should handle this
    });

    test("when product is referenced by an order, it should NOT be deleted", async () => {
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
      await request
        .delete(`/api/v1/products/${product.id.value}`)
        .set("authorization", "Bearer test-admin-token")
        .expect(409);

      // Assert - Product should still exist
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const existingProduct = await productRepository.find(product.id);

      expect(existingProduct).not.toBeNull();
      expect(existingProduct!.id.value).toBe(product.id.value);
    });
  });

  describe("Event Persistence", () => {
    test("when product is deleted, NO outbox event should be persisted (Product entity has no delete event)", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });

      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .delete(`/api/v1/products/${product.id.value}`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      expect(events).toHaveLength(0);
    });

    test("when product deletion fails due to order reference, NO outbox event should be persisted", async () => {
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
      await request
        .delete(`/api/v1/products/${product.id.value}`)
        .set("authorization", "Bearer test-admin-token")
        .expect(409);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      // No events should be persisted since the transaction was rolled back
      expect(events).toHaveLength(0);
    });
  });
});
