import type { Container } from "#/composition/container.js";
import { clearDatabase } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { env } from "#/infrastructure/config/env.js";

describe("GET /api/v1/shipping/communes/:wilayaCode", () => {
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
    test("when called with valid params, it should return an array of communes with status 200", async () => {
      // Arrange
      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/communes")
        .query({ wilaya_id: "16" })
        .reply(200, [
          {
            nom: "Commune 1",
            wilaya_id: 16,
            code_postal: "16001",
            has_stop_desk: 1,
          },
          {
            nom: "Commune 2",
            wilaya_id: 16,
            code_postal: "16002",
            has_stop_desk: 0,
          },
        ]);

      // Act
      const response = await request.get("/api/v1/shipping/communes/16").query({
        provider: "WORLD_EXPRESS",
      });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "Commune 1",
            wilayaCode: 16,
            postalCode: "16001",
            hasStopDesk: true,
          }),
          expect.objectContaining({
            name: "Commune 2",
            wilayaCode: 16,
            postalCode: "16002",
            hasStopDesk: false,
          }),
        ]),
      );
    });

    test("when api returns empty array, it should return 200 with empty array", async () => {
      // Arrange
      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/communes")
        .query({ wilaya_id: "16" })
        .reply(200, []);

      // Act
      const response = await request.get("/api/v1/shipping/communes/16").query({
        provider: "WORLD_EXPRESS",
      });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test("when world express api returns 500, it should return 502", async () => {
      // Arrange
      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/communes")
        .query({ wilaya_id: "16" })
        .reply(500, {
          error: "Internal Server Error",
        });

      // Act
      const response = await request.get("/api/v1/shipping/communes/16").query({
        provider: "WORLD_EXPRESS",
      });

      // Assert
      expect(response.status).toBe(502);
    });

    test("when wilayaCode is invalid, it should return 400", async () => {
      // Act
      const response = await request
        .get("/api/v1/shipping/communes/invalid")
        .query({
          provider: "WORLD_EXPRESS",
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when provider is missing, it should return 400", async () => {
      // Act
      const response = await request.get("/api/v1/shipping/communes/16");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when provider is invalid, it should return 400", async () => {
      // Act
      const response = await request.get("/api/v1/shipping/communes/16").query({
        provider: "INVALID_PROVIDER",
      });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
