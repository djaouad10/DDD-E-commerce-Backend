import type { Container } from "#/composition/utils/container.js";
import { clearDatabase } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { env } from "#/infrastructure/config/env.js";

describe("GET /api/v1/shipping/wilayas", () => {
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
    test("when called with a working world express api, it should return an array of wilayas with status 200", async () => {
      // Arrange
      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/wilayas")
        .reply(200, [
          {
            wilaya_id: 1,
            wilaya_name: "Wilaya 1",
          },
          {
            wilaya_id: 2,
            wilaya_name: "Wilaya 2",
          },
          {
            wilaya_id: 3,
            wilaya_name: "Wilaya 3",
          },
        ]);

      // Act
      const response = await request.get("/api/v1/shipping/wilayas").query({
        provider: "WORLD_EXPRESS",
      });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body).toEqual([
        expect.objectContaining({
          code: 1,
          name: "Wilaya 1",
        }),
        expect.objectContaining({
          code: 2,
          name: "Wilaya 2",
        }),
        expect.objectContaining({
          code: 3,
          name: "Wilaya 3",
        }),
      ]);
    });

    test("when world express api returns empty array, it should return 200 with empty array", async () => {
      // Arrange
      nock(env.WORLD_EXPRESS_API_URL).get("/get/wilayas").reply(200, []);

      // Act
      const response = await request.get("/api/v1/shipping/wilayas").query({
        provider: "WORLD_EXPRESS",
      });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test("when world express api returns 500, it should return 502", async () => {
      // Arrange
      nock(env.WORLD_EXPRESS_API_URL).get("/get/wilayas").reply(500, {
        error: "Internal Server Error",
      });

      // Act
      const response = await request.get("/api/v1/shipping/wilayas").query({
        provider: "WORLD_EXPRESS",
      });

      // Assert
      expect(response.status).toBe(502);
    });

    test("when provider is missing, it should return 400", async () => {
      // Act
      const response = await request.get("/api/v1/shipping/wilayas");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when provider is invalid, it should return 400", async () => {
      // Act
      const response = await request.get("/api/v1/shipping/wilayas").query({
        provider: "INVALID_PROVIDER",
      });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
