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

describe("PATCH /api/v1/categories", () => {
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
    test("when called with valid data, it should return the updated category with status 200 and valid shape", async () => {
      // Arrange
      const category = Category.create("Original Name");
      await createCategoryInDB(container, category);
      const newName = "Updated Name";

      // Act
      const response = await request
        .patch(`/api/v1/categories/${category.id.value}`)
        .send({ name: newName })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.name).toBe(newName.toLocaleLowerCase());
      expect(response.body.id).toBe(category.id.value);
      expect(response.body).toEqual({
        id: expect.any(String),
        name: expect.any(String),
      });
    });

    test("when called with empty name, it should return a validation error with status 400", async () => {
      // Arrange
      const category = Category.create("Original Name");
      await createCategoryInDB(container, category);

      // Act
      const response = await request
        .patch(`/api/v1/categories/${category.id.value}`)
        .send({ name: "" })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with name shorter than 3, it should return a validation error with status 400", async () => {
      // Arrange
      const category = Category.create("Original Name");
      await createCategoryInDB(container, category);

      // Act
      const response = await request
        .patch(`/api/v1/categories/${category.id.value}`)
        .send({ name: "ca" })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when category does not exist, it should return a 404 status", async () => {
      const category = Category.create("some name");

      // Act
      const response = await request
        .patch(`/api/v1/categories/${category.id.value}`)
        .send({ name: "Updated Name" })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should update the category name in the database", async () => {
      // Arrange
      const categoryRepository =
        container.resolveSingleton(CATEGORY_REPOSITORY);
      const category = Category.create("Original Name");
      await createCategoryInDB(container, category);
      const newName = "Updated Name";

      // Act
      await request
        .patch(`/api/v1/categories/${category.id.value}`)
        .send({ name: newName })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const updatedCategory = await categoryRepository.find(category.id);

      expect(updatedCategory).not.toBeNull();
      expect(updatedCategory!.getName()).toBe(newName.toLocaleLowerCase());
    });

    test("when called with same name, it should not fail and return 200", async () => {
      // Arrange
      const originalName = "Original Name";
      const category = Category.create(originalName);
      await createCategoryInDB(container, category);

      // Act
      const response = await request
        .patch(`/api/v1/categories/${category.id.value}`)
        .send({ name: originalName })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.name).toBe(originalName.toLocaleLowerCase());
    });
  });
});
