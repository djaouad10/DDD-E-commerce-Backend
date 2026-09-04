import type { Container } from "#/composition/utils/container.js";
import {
  clearDatabase,
  createCategoryInDB,
} from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { CATEGORY_REPOSITORY } from "#/composition/utils/tokens.js";
import { Category } from "#/domain/entities/category.js";

describe("DELETE /api/v1/categories/:id", () => {
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
    test("when called with valid id, it should return the deleted category with status 200 and valid shape", async () => {
      // Arrange
      const category = Category.create("Category To Delete");
      await createCategoryInDB(container, category);

      // Act
      const response = await request
        .delete(`/api/v1/categories/${category.id.value}`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(category.id.value);
      expect(response.body.name).toBe(category.getName());
      expect(response.body).toEqual({
        id: expect.any(String),
        name: expect.any(String),
      });
    });

    test("when category does not exist, it should return a 404 status", async () => {
      // Arrange
      const category = Category.create("Nonexistent");

      // Act
      const response = await request
        .delete(`/api/v1/categories/${category.id.value}`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("New State Validation", () => {
    test("when called with valid id, it should remove the category from the database", async () => {
      // Arrange
      const categoryRepository =
        container.resolveSingleton(CATEGORY_REPOSITORY);
      const category = Category.create("Category To Delete");
      await createCategoryInDB(container, category);

      // Act
      await request
        .delete(`/api/v1/categories/${category.id.value}`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const deletedCategory = await categoryRepository.find(category.id);

      expect(deletedCategory).toBeNull();
    });
  });
});
