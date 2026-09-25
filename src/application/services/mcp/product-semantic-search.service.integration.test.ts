import { describe, expect, test, vi } from "vitest";
import { ProductSemanticSearchQuery } from "#/application/queries/product-semantic-search.query.js";
import { buildIntegrationTestsContainer } from "#/composition/roots/tests/integration-tests-composition.js";
import type { Container } from "#/composition/utils/container.js";
import {
  PRODUCT_QUERIES,
  PRODUCT_REPOSITORY,
  PRODUCT_SEMANTIC_SEARCH_SERVICE,
  TEXT_EMBEDDING_MODEL_PORT,
} from "#/composition/utils/tokens.js";
import { Category } from "#/domain/entities/category.js";
import { Color, Size } from "#/domain/entities/product.js";
import { Variation } from "#/domain/entities/variation.js";
import { Weight } from "#/domain/value-objects/weight.js";
import { GatewayError } from "#/shared/errors/errors.js";
import {
  clearDatabase,
  createCategoryInDB,
  createProductInDB,
  getCategoryByName,
} from "#/tests/helpers/db-helpers.js";
import { productFactory } from "#/tests/helpers/domain-helpers.js";
import { embedAndSaveProductChunksInDB } from "#/tests/helpers/embedding-helpers.js";
import { type FakeTextEmbeddingModel } from "#/tests/helpers/fake-text-embedding-model.js";
import type { ProductSemanticSearchService } from "./product-semantic-search.service.js";

describe("ProductSemanticSearchService — additional coverage", () => {
  let container: Container;
  let service: ProductSemanticSearchService;
  let fakeEmbedModel: FakeTextEmbeddingModel;

  beforeAll(() => {
    container = buildIntegrationTestsContainer();
    service = container.resolveSingleton(PRODUCT_SEMANTIC_SEARCH_SERVICE);
    fakeEmbedModel = container.resolveSingleton(
      TEXT_EMBEDDING_MODEL_PORT,
    ) as FakeTextEmbeddingModel;
  });

  beforeEach(async () => {
    await clearDatabase(container);
    vi.restoreAllMocks();
    fakeEmbedModel.embed.mockClear();
  });

  // name + description both carry `text` -> two chunks match any query containing
  // those tokens, which is exactly what the dedup test needs
  async function makeProduct(params: {
    category: Category;
    text: string;
    variations?: Variation[];
    price?: number;
    discountedPrice?: number;
  }) {
    let category = await getCategoryByName(
      container,
      params.category.getName(),
    );

    if (!category) {
      await createCategoryInDB(container, params.category);
    }

    category = await getCategoryByName(container, params.category.getName());

    const product = productFactory({
      categoryId: category!.id,
      ...(params.variations ? { customVariations: params.variations } : {}),
      ...(params.price && { price: params.price }),
      discountPrice: !params.discountedPrice ? null : params.discountedPrice,
    });

    product.updateName(params.text);
    product.updateDescription(params.text);

    await createProductInDB(container, product);
    await embedAndSaveProductChunksInDB(container, product, category!);

    const productRepo = container.resolveSingleton(PRODUCT_REPOSITORY);
    const latestProduct = await productRepo.find(product.id);

    return latestProduct!;
  }

  test("when called with no limit or filters, it passes limit 5 and empty filters defaults to the query layer", async () => {
    // Arrange
    const productQueries = container.resolveSingleton(PRODUCT_QUERIES);
    const spy = vi.spyOn(productQueries, "semanticSearch");

    // Act
    await service.execute(new ProductSemanticSearchQuery("anything"));

    // Assert
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, filters: {} }),
    );
  });

  test("when called with valid params, it embeds the query exactly once with the raw user text", async () => {
    await service.execute(new ProductSemanticSearchQuery("running shoes"));

    expect(fakeEmbedModel.embed).toHaveBeenCalledTimes(1);
    expect(fakeEmbedModel.embed).toHaveBeenCalledWith(["running shoes"]);
  });

  test("when the model returns no embedding, it throws GatewayError", async () => {
    // Arrange
    const productQueries = container.resolveSingleton(PRODUCT_QUERIES);
    const spy = vi.spyOn(productQueries, "semanticSearch");
    fakeEmbedModel.embed.mockResolvedValueOnce([]);

    // Act
    await expect(
      service.execute(new ProductSemanticSearchQuery("running shoes")),
    ).rejects.toThrow(GatewayError);

    // Assert
    expect(spy).not.toHaveBeenCalled(); // fail before touching the DB
  });

  test("when called with valid params, it returns at most `limit` hits ordered by ascending distance", async () => {
    // Arrange
    const category = Category.create("Shoes");

    const best = await makeProduct({
      category,
      text: "running shoe", // shares BOTH query tokens
    });

    await makeProduct({ category, text: "running" });
    await makeProduct({ category, text: "shoe" });
    await makeProduct({ category, text: "sandal" });
    await makeProduct({ category, text: "boot" });
    await makeProduct({ category, text: "slipper" });

    // Act
    const hits = await service.execute(
      new ProductSemanticSearchQuery("running shoe", 3, {}),
    );

    // Assert
    expect(hits).toHaveLength(3);
    expect(hits[0]!.productId).toBe(best.id.value);
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i]!.similarityDistance).toBeGreaterThanOrEqual(
        hits[i - 1]!.similarityDistance,
      );
      expect(Number.isFinite(hits[i]!.similarityDistance)).toBe(true);
    }
  });

  test("when a product has several matching chunks, it appears exactly once", async () => {
    // Arrange
    const category = Category.create("Running Shoes");

    const product = await makeProduct({
      category,
      text: "running shoe", // name chunk AND description chunk both match
    });

    // Act
    const hits = await service.execute(
      new ProductSemanticSearchQuery("running shoe", 10, {}),
    );

    // Assert
    expect(hits.filter((h) => h.productId === product.id.value)).toHaveLength(
      1,
    );
  });

  test("when a product is not indexed, it should not be returned", async () => {
    // Arrange
    // product exists in the products table but has NO embedding rows
    // e.g. created before the indexing pipeline, or indexing failed
    const category = Category.create("Running Shoes");
    await createCategoryInDB(container, category);

    const unindexed = productFactory({ categoryId: category.id });
    unindexed.updateName("running shoe");
    await createProductInDB(container, unindexed); // NOTE: no embedAndSave

    // Act
    const hits = await service.execute(
      new ProductSemanticSearchQuery("running shoe", 5, {}),
    );

    // Assert
    expect(
      hits.find((h) => h.productId === unindexed.id.value),
    ).toBeUndefined();
  });

  test("when a maxPrice filter is set, it filters by maxPrice on the DISPLAY price (COALESCE picks up the discount)", async () => {
    // Arrange
    const category = Category.create("Shoes");

    const onSale = await makeProduct({
      category,
      text: "sport shoe",
      price: 9000,
      discountedPrice: 4000, // display price 4000 -> passes maxPrice 5000
    });
    await makeProduct({
      category,
      text: "sport shoe",
      price: 9000, // display price 9000 -> filtered out
    });

    // Act
    const hits = await service.execute(
      new ProductSemanticSearchQuery("sport shoe", 5, { maxPrice: 5000 }),
    );

    // Assert
    expect(hits.map((h) => h.productId)).toEqual([onSale.id.value]);
  });

  test("whne a minPrice filter is set, it excludes cheaper products", async () => {
    // Arrange
    const category = Category.create("Shoes");

    await makeProduct({
      category,
      text: "sport shoe",
      price: 4000,
    });

    const expensive = await makeProduct({
      category,
      text: "sport shoe",
      price: 9000,
    });

    // Act
    const hits = await service.execute(
      new ProductSemanticSearchQuery("sport shoe", 5, { minPrice: 6000 }),
    );

    // Assert
    expect(hits.map((h) => h.productId)).toEqual([expensive.id.value]);
  });

  test("when a colors filter is set, it matches via EXISTS on variations", async () => {
    // Arrange
    const category = Category.create("Tees");

    const red = await makeProduct({
      category,
      text: "cotton shirt",
      variations: [
        Variation.create(Size.M, Color.RED, 10, 0, Weight.of(100, "g")),
      ],
    });

    await makeProduct({
      category,
      text: "cotton shirt",
      variations: [
        Variation.create(Size.M, Color.BLUE, 10, 0, Weight.of(100, "g")),
      ],
    });

    // Act
    const hits = await service.execute(
      new ProductSemanticSearchQuery("cotton shirt", 5, {
        colors: [Color.RED],
      }),
    );

    // Assert
    expect(hits.map((h) => h.productId)).toEqual([red.id.value]);
  });

  test("when an inStock filter is set, it excludes products with no available quantity", async () => {
    // Arrange
    const category = Category.create("Tees");

    await makeProduct({
      category,
      text: "cotton shirt",
      variations: [
        // total 100, reserved 100 -> available 0
        Variation.create(Size.M, Color.RED, 100, 100, Weight.of(100, "g")),
      ],
    });

    const inStock = await makeProduct({
      category,
      text: "cotton shirt",
      variations: [
        Variation.create(Size.M, Color.RED, 100, 0, Weight.of(100, "g")),
      ],
    });

    // Act
    const hits = await service.execute(
      new ProductSemanticSearchQuery("cotton shirt", 5, { inStock: true }),
    );

    // Assert
    expect(hits.map((h) => h.productId)).toEqual([inStock.id.value]);
  });

  test("when combined filters: maxPrice + colors + inStock are used together, it should respect all of them", async () => {
    // Arrange
    const category = Category.create("Tees");

    const match = await makeProduct({
      category,
      text: "cotton shirt",
      price: 4000,
      variations: [
        Variation.create(Size.M, Color.RED, 100, 0, Weight.of(100, "g")),
      ],
    });

    await makeProduct({
      category,
      text: "cotton shirt",
      price: 9000, // too expensive
      variations: [
        Variation.create(Size.M, Color.RED, 100, 0, Weight.of(100, "g")),
      ],
    });

    await makeProduct({
      category,
      text: "cotton shirt",
      price: 4000,
      variations: [
        Variation.create(Size.M, Color.BLUE, 100, 0, Weight.of(100, "g")),
      ],
    });

    // Act
    const hits = await service.execute(
      new ProductSemanticSearchQuery("cotton shirt", 5, {
        maxPrice: 5000,
        colors: [Color.RED],
        inStock: true,
      }),
    );

    // Assert
    expect(hits.map((h) => h.productId)).toEqual([match.id.value]);
  });

  test("returns an empty array (not an error) when filters exclude everything", async () => {
    // Arrange
    const category = Category.create("Shoes");

    await makeProduct({
      category,
      text: "sport shoe",
      price: 9000,
    });

    // Act
    const hits = await service.execute(
      new ProductSemanticSearchQuery("sport shoe", 5, { maxPrice: 100 }),
    );

    // Assert
    expect(hits).toEqual([]);
  });
});
