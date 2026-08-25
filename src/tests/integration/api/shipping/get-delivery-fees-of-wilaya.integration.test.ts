import type { Container } from "#/composition/container.js";
import { clearDatabase } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { env } from "#/infrastructure/config/env.js";

describe("GET /api/v1/shipping/fees/:wilayaCode", () => {
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
    test("when called with valid params, it should return delivery fees with status 200", async () => {
      // Arrange
      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/fees")
        .reply(200, {
          livraison: [
            {
              wilaya_id: 16,
              tarif: "500",
              tarif_stopdesk: "350",
            },
          ],
          pickup: [],
          echange: [],
          recouvrement: [],
          retours: [],
        });

      // Act
      const response = await request.get("/api/v1/shipping/fees/16").query({
        provider: "WORLD_EXPRESS",
      });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        homeFees: {
          amount: 500,
          currency: "DZD",
        },
        deskFees: {
          amount: 350,
          currency: "DZD",
        },
      });
    });

    test("when wilaya has no fees, it should return 404", async () => {
      // Arrange
      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/fees")
        .reply(200, {
          livraison: [
            {
              wilaya_id: 1,
              tarif: "500",
              tarif_stopdesk: "350",
            },
          ],
          pickup: [],
          echange: [],
          recouvrement: [],
          retours: [],
        });

      // Act
      const response = await request.get("/api/v1/shipping/fees/16").query({
        provider: "WORLD_EXPRESS",
      });

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when world express api returns 500, it should return 502", async () => {
      // Arrange
      nock(env.WORLD_EXPRESS_API_URL).get("/get/fees").reply(500, {
        error: "Internal Server Error",
      });

      // Act
      const response = await request.get("/api/v1/shipping/fees/16").query({
        provider: "WORLD_EXPRESS",
      });

      // Assert
      expect(response.status).toBe(502);
    });

    test("when wilayaCode is invalid, it should return 400", async () => {
      // Act
      const response = await request
        .get("/api/v1/shipping/fees/invalid")
        .query({
          provider: "WORLD_EXPRESS",
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when provider is missing, it should return 400", async () => {
      // Act
      const response = await request.get("/api/v1/shipping/fees/16");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when provider is invalid, it should return 400", async () => {
      // Act
      const response = await request.get("/api/v1/shipping/fees/16").query({
        provider: "INVALID_PROVIDER",
      });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
