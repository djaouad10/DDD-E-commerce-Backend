import type { Container } from "#/composition/utils/container.js";
import {
  clearDatabase,
  createCategoryInDB,
} from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { Category } from "#/domain/entities/category.js";
import {
  PRODUCT_REPOSITORY,
  OUTBOX_REPOSITORY,
} from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { Size, Color } from "#/domain/entities/product.js";

describe("POST /api/v1/products", () => {
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
    test("when called with valid data, it should return 200 with created product snapshot", async () => {
      // Arrange
      const category = Category.create("Electronics");
      await createCategoryInDB(container, category);

      const body = {
        name: "Test Product",
        description: "A great product",
        price: 5000,
        discountPrice: 4500,
        brand: "TestBrand",
        material: "Cotton",
        categoryId: category.id.value,
        mainImage: {
          name: "main.jpg",
          publicUrl: "https://example.com/main.jpg",
          key: "main-key-123",
        },
        variations: [
          {
            size: Size.M,
            color: Color.RED,
            totalQty: 100,
            weightInGrams: 250,
          },
          {
            size: Size.L,
            color: Color.BLUE,
            totalQty: 50,
            weightInGrams: 300,
          },
        ],
      };

      // Act
      const response = await request
        .post("/api/v1/products")
        .send(body)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: body.name,
          slug: expect.any(String),
          description: body.description,
          brand: body.brand,
          material: body.material,
          price: { amount: body.price, currency: "DZD" },
          discountedPrice: { amount: body.discountPrice, currency: "DZD" },
          categoryId: category.id.value,
          averageRating: null,
          discountAmount: { amount: 500, currency: "DZD" },
          discountPercentage: 10,
          images: expect.arrayContaining([
            expect.objectContaining({
              name: body.mainImage.name,
              publicUrl: body.mainImage.publicUrl,
              isMain: true,
            }),
          ]),
          variations: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              size: Size.M,
              color: Color.RED,
              totalQty: 100,
              reservedQty: 0,
              availableQty: 100,
              isInStock: true,
              weightInGrams: { weight: 250, unit: "g" },
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            }),
            expect.objectContaining({
              id: expect.any(String),
              size: Size.L,
              color: Color.BLUE,
              totalQty: 50,
              reservedQty: 0,
              availableQty: 50,
              isInStock: true,
              weightInGrams: { weight: 300, unit: "g" },
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
            }),
          ]),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );
      expect(response.body.images).toHaveLength(1);
      expect(response.body.variations).toHaveLength(2);
    });

    test("when called without categoryId, it should return 200 with null categoryId", async () => {
      // Arrange
      const body = {
        name: "Uncategorized Product",
        description: null,
        price: 3000,
        discountPrice: null,
        brand: "NoBrand",
        material: "Plastic",
        categoryId: null,
        mainImage: {
          name: "main.jpg",
          publicUrl: "https://example.com/main.jpg",
          key: "main-key-456",
        },
        variations: [
          {
            size: Size.S,
            color: Color.BLACK,
            totalQty: 20,
            weightInGrams: 150,
          },
        ],
      };

      // Act
      const response = await request
        .post("/api/v1/products")
        .send(body)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.categoryId).toBeNull();
      expect(response.body.name).toBe(body.name);
    });

    test("when called with invalid price (negative), it should return 400", async () => {
      // Act
      const response = await request
        .post("/api/v1/products")
        .send({
          name: "Bad Product",
          description: null,
          price: -100,
          discountPrice: null,
          brand: "Brand",
          material: "Material",
          categoryId: null,
          mainImage: {
            name: "main.jpg",
            publicUrl: "https://example.com/main.jpg",
            key: "key",
          },
          variations: [
            {
              size: Size.M,
              color: Color.RED,
              totalQty: 10,
              weightInGrams: 100,
            },
          ],
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with discountPrice >= price, it should return 400", async () => {
      // Act
      const response = await request
        .post("/api/v1/products")
        .send({
          name: "Bad Product",
          description: null,
          price: 1000,
          discountPrice: 1500,
          brand: "Brand",
          material: "Material",
          categoryId: null,
          mainImage: {
            name: "main.jpg",
            publicUrl: "https://example.com/main.jpg",
            key: "key",
          },
          variations: [
            {
              size: Size.M,
              color: Color.RED,
              totalQty: 10,
              weightInGrams: 100,
            },
          ],
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with empty variations array, it should return 400", async () => {
      // Act
      const response = await request
        .post("/api/v1/products")
        .send({
          name: "No Variations",
          description: null,
          price: 1000,
          discountPrice: null,
          brand: "Brand",
          material: "Material",
          categoryId: null,
          mainImage: {
            name: "main.jpg",
            publicUrl: "https://example.com/main.jpg",
            key: "key",
          },
          variations: [],
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with invalid variation weight, it should return 400", async () => {
      // Act
      const response = await request
        .post("/api/v1/products")
        .send({
          name: "Bad Variation",
          description: null,
          price: 1000,
          discountPrice: null,
          brand: "Brand",
          material: "Material",
          categoryId: null,
          mainImage: {
            name: "main.jpg",
            publicUrl: "https://example.com/main.jpg",
            key: "key",
          },
          variations: [
            {
              size: Size.M,
              color: Color.RED,
              totalQty: 10,
              weightInGrams: 0,
            },
          ],
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when client token is used, it should return 403", async () => {
      // Act
      const response = await request
        .post("/api/v1/products")
        .send({
          name: "Test",
          description: null,
          price: 1000,
          discountPrice: null,
          brand: "Brand",
          material: "Material",
          categoryId: null,
          mainImage: {
            name: "main.jpg",
            publicUrl: "https://example.com/main.jpg",
            key: "key",
          },
          variations: [
            {
              size: Size.M,
              color: Color.RED,
              totalQty: 10,
              weightInGrams: 100,
            },
          ],
        })
        .set("authorization", "Bearer test-client-token");

      // Assert
      expect(response.status).toBe(403);
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Act
      const response = await request.post("/api/v1/products").send({
        name: "Test",
        description: null,
        price: 1000,
        discountPrice: null,
        brand: "Brand",
        material: "Material",
        categoryId: null,
        mainImage: {
          name: "main.jpg",
          publicUrl: "https://example.com/main.jpg",
          key: "key",
        },
        variations: [
          {
            size: Size.M,
            color: Color.RED,
            totalQty: 10,
            weightInGrams: 100,
          },
        ],
      });

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should persist product to DB", async () => {
      // Arrange
      const category = Category.create("Electronics");
      await createCategoryInDB(container, category);

      const body = {
        name: "DB Test Product",
        description: "For DB verification",
        price: 4000,
        discountPrice: 3500,
        brand: "DBBrand",
        material: "Metal",
        categoryId: category.id.value,
        mainImage: {
          name: "db-main.jpg",
          publicUrl: "https://example.com/db-main.jpg",
          key: "db-main-key",
        },
        variations: [
          {
            size: Size.XL,
            color: Color.GREEN,
            totalQty: 75,
            weightInGrams: 400,
          },
        ],
      };

      // Act
      const response = await request
        .post("/api/v1/products")
        .send(body)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const productRepository = container.resolveSingleton(PRODUCT_REPOSITORY);
      const savedProduct = await productRepository.find({
        value: response.body.id,
      } as any);

      expect(savedProduct).not.toBeNull();
      expect(savedProduct!.getName()).toBe(body.name);
      expect(savedProduct!.getPrice().amount).toBe(body.price);
      expect(savedProduct!.getVariations()).toHaveLength(1);
      expect(savedProduct!.getImages()).toHaveLength(1);
      expect(savedProduct!.getMainImage().getKey()).toBe(body.mainImage.key);
    });

    test("when called with valid data, it should persist ProductCreated event to outbox", async () => {
      // Arrange
      const category = Category.create("Electronics");
      await createCategoryInDB(container, category);

      const body = {
        name: "Event Test Product",
        description: "For event verification",
        price: 2500,
        discountPrice: null,
        brand: "EventBrand",
        material: "Wood",
        categoryId: category.id.value,
        mainImage: {
          name: "event-main.jpg",
          publicUrl: "https://example.com/event-main.jpg",
          key: "event-main-key",
        },
        variations: [
          {
            size: Size.M,
            color: Color.BEIGE,
            totalQty: 30,
            weightInGrams: 200,
          },
        ],
      };

      // Act
      await request
        .post("/api/v1/products")
        .send(body)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const productCreatedEvent = events.find(
        (e) => e.eventType === DomainEventCode.PRODUCT_CREATED,
      );
      expect(productCreatedEvent).toBeDefined();
      expect(productCreatedEvent!.aggregateId).toBeDefined();
      expect(productCreatedEvent!.payload).toMatchObject({
        name: body.name,
        brand: body.brand,
        price: body.price,
        currency: "DZD",
      });
    });
  });
});
