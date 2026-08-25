import supertest from "supertest";
import type { Express } from "express";
import nock from "nock";
import { createTestApp, cleanupTestApp } from "#/tests/helpers/test-app.js";
import { Category } from "#/domain/entities/category.js";
import type { Container } from "#/composition/container.js";
import {
  clearDatabase,
  createCategoryInDB,
} from "#/tests/helpers/db-helpers.js";

describe("GET /api/v1/categories", () => {
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
    test("when called with empty database, it should return an empty array with status 200", async () => {
      const response = await request.get("/api/v1/categories");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test("when called with populated database, it should return an array of categories with status 200", async () => {
      const category1 = Category.create("Category 1");
      const category2 = Category.create("Category 2");
      await createCategoryInDB(container, category1);
      await createCategoryInDB(container, category2);

      const response = await request.get("/api/v1/categories");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { id: category1.id.value, name: category1.getName() },
        { id: category2.id.value, name: category2.getName() },
      ]);
    });
  });
});
