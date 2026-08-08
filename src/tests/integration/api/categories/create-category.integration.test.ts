import type { Container } from "#/composition/container.js";
import { clearDatabase } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { CATEGORY_REPOSITORY } from "#/composition/tokens.js";

describe("POST /api/v1/categories", () => {
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
    test("when called with valid data, it should return the created category with status 201 and valid shape", async () => {
      // Arrange
      const categoryName = "Test Category";

      // Act
      const response = await request
        .post("/api/v1/categories")
        .send({
          name: categoryName,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.name).toBe(categoryName.toLocaleLowerCase());
      expect(response.body).toEqual({
        id: expect.any(String),
        name: expect.any(String),
      });
    });

    test("when called with empty name, it should return a validation error with status 400", async () => {
      // Act
      const response = await request
        .post("/api/v1/categories")
        .send({
          name: "",
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
    });

    test("when called with name shorter than 3, it should return a validation error with status 400", async () => {
      // Act
      const response = await request
        .post("/api/v1/categories")
        .send({
          name: "ca",
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
    });

    test("when attempting duplication, it should return a 409 status", async () => {
      // Arrange
      const categoryName = "Test Category";

      await request
        .post("/api/v1/categories")
        .send({
          name: categoryName,
        })
        .set("authorization", "Bearer test-admin-token");

      // Act
      const response2 = await request
        .post("/api/v1/categories")
        .send({
          name: categoryName,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response2.status).toBe(409);
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should create a new category", async () => {
      // Arrange
      const categoryRepository =
        container.resolveSingleton(CATEGORY_REPOSITORY);
      const categoryName = "Test Category";

      // Act
      await request
        .post("/api/v1/categories")
        .send({
          name: categoryName,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const categoryInDB = (await categoryRepository.findMany())[0];

      expect(categoryInDB!.getName()).toBe(categoryName.toLocaleLowerCase());
    });
  });
});
