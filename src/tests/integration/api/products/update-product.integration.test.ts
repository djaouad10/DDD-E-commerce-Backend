import type { Container } from "#/composition/utils/container.js";
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
import { Category } from "#/domain/entities/category.js";
import { ProductId } from "#/domain/value-objects/product-id.js";
import {
  PRODUCT_REPOSITORY,
  OUTBOX_REPOSITORY,
} from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import type { ProductUpdated } from "#/domain/events/product/product-updated.js";

describe("PATCH /api/v1/products/:id", () => {
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
    test("when called with valid name, it should return 200 with success true", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ name: "Updated Name" })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with valid description, it should return 200 with success true", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ description: "Updated description" })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with valid brand, it should return 200 with success true", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ brand: "NewBrand" })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with valid material, it should return 200 with success true", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ material: "Silk" })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with valid price, it should return 200 with success true", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ price: 5000 })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with valid discountPrice, it should return 200 with success true", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ discountPrice: 1000 })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with valid categoryId, it should return 200 with success true", async () => {
      // Arrange
      const category = Category.create("Category");
      const newCategory = Category.create("New Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createCategoryInDB(container, newCategory);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ categoryId: newCategory.id.value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with multiple fields, it should return 200 with success true", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ name: "New Name", brand: "NewBrand", price: 5000 })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with both price and discountPrice and price > discountPrice, it should return 200", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ price: 5000, discountPrice: 4000 })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called with empty body, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({})
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
    });

    test("when called with invalid product id format, it should return 400", async () => {
      // Act
      const response = await request
        .patch("/api/v1/products/invalid-id")
        .send({ name: "Updated" })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when product does not exist, it should return 404", async () => {
      // Act
      const response = await request
        .patch(`/api/v1/products/${ProductId.generate().value}`)
        .send({ name: "Updated" })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when called with negative price, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ price: -100 })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with zero price, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ price: 0 })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with discountPrice >= existing price, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        price: 2000,
        discountPrice: 1500,
      });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ discountPrice: 2500 })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with price <= existing discountPrice, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        price: 2000,
        discountPrice: 1500,
      });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ price: 1000 })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with both price and discountPrice where price <= discountPrice, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ price: 1000, discountPrice: 1500 })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
    });

    test("when called with negative discountPrice, it should return 400", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ discountPrice: -100 })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ name: "Updated" });

      // Assert
      expect(response.status).toBe(401);
    });

    test("when client token is used, it should return 403", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      const response = await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ name: "Updated" })
        .set("authorization", "Bearer test-client-token");

      // Assert
      expect(response.status).toBe(403);
    });
  });

  describe("New State Validation", () => {
    test("when called with name, it should update name and slug in DB", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const newName = "Completely New Product Name";

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ name: newName })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getName()).toBe(newName);
      expect(updatedProduct!.getSlug().value).toContain(
        newName.toLowerCase().replace(/\s+/g, "-"),
      );
    });

    test("when called with description, it should update description in DB", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const newDescription = "This is the new description";

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ description: newDescription })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getDescription()).toBe(newDescription);
    });

    test("when called with description null, it should set description to null", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ description: null })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getDescription()).toBeNull();
    });

    test("when called with brand, it should update brand in DB", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const newBrand = "PremiumBrand";

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ brand: newBrand })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getBrand()).toBe(newBrand);
    });

    test("when called with material, it should update material in DB", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const newMaterial = "Leather";

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ material: newMaterial })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getMaterial()).toBe(newMaterial);
    });

    test("when called with price, it should update price in DB", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        price: 2000,
        discountPrice: 1500,
      });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const newPrice = 5000;

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ price: newPrice })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getPrice().amount).toBe(newPrice);
      expect(updatedProduct!.getPrice().currency).toBe("DZD");
    });

    test("when called with discountPrice, it should update discountPrice in DB", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        price: 2000,
        discountPrice: 1500,
      });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const newDiscountPrice = 1000;

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ discountPrice: newDiscountPrice })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getDiscountedPrice()!.amount).toBe(
        newDiscountPrice,
      );
      expect(updatedProduct!.getDiscountedPrice()!.currency).toBe("DZD");
    });

    test("when called with discountPrice null, it should remove discountPrice", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        price: 2000,
        discountPrice: 1500,
      });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ discountPrice: null })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getDiscountedPrice()).toBeNull();
    });

    test("when called with categoryId, it should update category in DB", async () => {
      // Arrange
      const category = Category.create("Category");
      const newCategory = Category.create("New Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createCategoryInDB(container, newCategory);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ categoryId: newCategory.id.value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getCategoryId()!.value).toBe(newCategory.id.value);
    });

    test("when called with categoryId null, it should set category to null", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ categoryId: null })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getCategoryId()).toBeNull();
    });

    test("when called with multiple fields, it should update all fields in DB", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        price: 2000,
        discountPrice: 1500,
      });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({
          name: "Multi Update",
          brand: "MultiBrand",
          material: "MultiMaterial",
          price: 5000,
          description: "Multi description",
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getName()).toBe("Multi Update");
      expect(updatedProduct!.getBrand()).toBe("MultiBrand");
      expect(updatedProduct!.getMaterial()).toBe("MultiMaterial");
      expect(updatedProduct!.getPrice().amount).toBe(5000);
      expect(updatedProduct!.getDescription()).toBe("Multi description");
    });

    test("when called with both price and discountPrice, it should update both in DB", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({
        categoryId: category.id,
        price: 2000,
        discountPrice: 1500,
      });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ price: 5000, discountPrice: 4000 })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const updatedProduct = await productRepository.find(product.id);

      expect(updatedProduct).not.toBeNull();
      expect(updatedProduct!.getPrice().amount).toBe(5000);
      expect(updatedProduct!.getDiscountedPrice()!.amount).toBe(4000);
    });

    test("when called with valid data, it should persist ProductUpdated event to outbox", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ name: "Event Test" })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const productUpdatedEvent = events.find(
        (e) => e.eventType === DomainEventCode.PRODUCT_UPDATED,
      );
      expect(productUpdatedEvent).toBeDefined();
      expect(productUpdatedEvent!.aggregateId).toBe(product.id.value);
      expect(
        (productUpdatedEvent!.payload as ProductUpdated).changedFields,
      ).toEqual(expect.arrayContaining(["name"]));
    });

    test("when called with multiple fields, it should persist multiple ProductUpdated events", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ name: "Name", brand: "Brand" })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const productUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.PRODUCT_UPDATED,
      );
      expect(productUpdatedEvents).toHaveLength(2);

      const allFields = productUpdatedEvents.flatMap(
        (e) => (e.payload as ProductUpdated).changedFields,
      );
      expect(allFields).toEqual(expect.arrayContaining(["name", "brand"]));
    });

    test("when no fields change, no ProductUpdated event should be emitted", async () => {
      // Arrange
      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // Act
      await request
        .patch(`/api/v1/products/${product.id.value}`)
        .send({ name: product.getName() })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const productUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.PRODUCT_UPDATED,
      );
      expect(productUpdatedEvents).toHaveLength(0);
    });
  });
});
