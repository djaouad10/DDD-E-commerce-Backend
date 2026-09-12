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
import { PRODUCT_REPOSITORY } from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { Size, Color } from "#/domain/entities/product.js";
import { adminAuth, clientAuth } from "#/tests/helpers/auth-helpers.js";
import { expectOutboxEvent } from "#/tests/helpers/outbox-assertions.js";

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

  function createValidBody({
    category,
    overrides,
  }: {
    category?: Category;
    overrides?: Partial<{
      name: string;
      description: string;
      price: number;
      discountPrice: number;
      brand: string;
      material: string;
      categoryId: string;
      mainImage: {
        name: string;
        publicUrl: string;
        key: string;
      };
      variations: Array<{
        size: Size;
        color: Color;
        totalQty: number;
        weightInGrams: number;
      }>;
    }>;
  }) {
    return {
      name: overrides?.name ?? "Test Product",
      description:
        overrides?.description !== undefined
          ? overrides.description
          : "A great product",
      price: overrides?.price ?? 5000,
      discountPrice:
        overrides?.discountPrice !== undefined ? overrides.discountPrice : 4500,
      brand: overrides?.brand ?? "TestBrand",
      material: overrides?.material ?? "Cotton",
      categoryId: category?.id.value ?? null,
      mainImage: overrides?.mainImage ?? {
        name: "main.jpg",
        publicUrl: "https://example.com/main.jpg",
        key: "main-key-123",
      },
      variations: overrides?.variations ?? [
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
  }

  async function setupCategoryInDB(name: string): Promise<Category> {
    const category = Category.create(name);
    await createCategoryInDB(container, category);
    return category;
  }

  describe("Response Validation", () => {
    test("when called with valid data, it should return 200 with created product snapshot", async () => {
      // Arrange
      const category = await setupCategoryInDB("Category");

      const body = createValidBody({ category });

      // Act
      const response = await request
        .post("/api/v1/products")
        .send(body)
        .set("authorization", adminAuth());

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
      const body = createValidBody({});

      // Act
      const response = await request
        .post("/api/v1/products")
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.categoryId).toBeNull();
      expect(response.body.name).toBe(body.name);
    });

    test.each([
      ["invalid price (negative)", { price: -5000 }],
      ["invalid price (zero)", { price: 0 }],
      ["invalid discountPrice (negative)", { discountPrice: -5000 }],
      ["discountPrice >= price", { discountPrice: 5000, price: 4000 }],
      ["empty variations array", { variations: [] }],
      [
        "invalid variation weight",
        {
          variations: [
            {
              size: Size.M,
              color: Color.RED,
              totalQty: 10,
              weightInGrams: 0,
            },
          ],
        },
      ],
    ])("when called with %s, it should return 400", async (_, overrides) => {
      // Arrange
      const body = createValidBody({
        overrides,
      });

      // Act
      const response = await request
        .post("/api/v1/products")
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when client token is used, it should return 403", async () => {
      // Arrange
      const body = createValidBody({});

      // Act
      const response = await request
        .post("/api/v1/products")
        .send(body)
        .set("authorization", clientAuth());

      // Assert
      expect(response.status).toBe(403);
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const body = createValidBody({});

      // Act
      const response = await request.post("/api/v1/products").send(body);

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should persist product to DB", async () => {
      // Arrange
      const body = createValidBody({
        overrides: {
          variations: [
            {
              size: Size.M,
              color: Color.RED,
              totalQty: 10,
              weightInGrams: 400,
            },
          ],
        },
      });

      // Act
      const response = await request
        .post("/api/v1/products")
        .send(body)
        .set("authorization", adminAuth());

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
      const body = createValidBody({});

      // Act
      const response = await request
        .post("/api/v1/products")
        .send(body)
        .set("authorization", adminAuth());

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.PRODUCT_CREATED,
        response.body.id,
      );

      expect(event.payload).toMatchObject({
        name: body.name,
        brand: body.brand,
        price: body.price,
        currency: "DZD",
      });
    });
  });
});
