import type { Container } from "#/composition/utils/container.js";
import { clearDatabase } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { env } from "#/infrastructure/config/env.js";

describe("GET /api/v1/shipping/label/:tracking", () => {
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
    test("when admin calls with valid params, it should return 200 with PDF buffer and correct headers", async () => {
      // Arrange
      const pdfBuffer = Buffer.from("%PDF-1.4 fake pdf content");

      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/order/label")
        .query({ tracking: "TRACK123456" })
        .reply(200, pdfBuffer, {
          "content-type": "application/pdf",
          "content-disposition": 'attachment; filename="label_TRACK123456.pdf"',
        });

      // Act
      const response = await request
        .get("/api/v1/shipping/label/TRACK123456")
        .query({
          provider: "WORLD_EXPRESS",
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("application/pdf");
      expect(response.headers["content-disposition"]).toBe(
        "attachment; filename=label_TRACK123456.pdf",
      );
      expect(Buffer.isBuffer(response.body)).toBe(true);
      expect(response.body.toString()).toBe(pdfBuffer.toString());
    });

    test("when api returns 404, it should return 404", async () => {
      // Arrange
      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/order/label")
        .query({ tracking: "NONEXISTENT" })
        .reply(404, { error: "Not found" });

      // Act
      const response = await request
        .get("/api/v1/shipping/label/NONEXISTENT")
        .query({
          provider: "WORLD_EXPRESS",
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when api returns 500, it should return 502", async () => {
      // Arrange
      nock(env.WORLD_EXPRESS_API_URL)
        .get("/get/order/label")
        .query({ tracking: "TRACK999999" })
        .reply(500, { error: "Internal Server Error" });

      // Act
      const response = await request
        .get("/api/v1/shipping/label/TRACK999999")
        .query({
          provider: "WORLD_EXPRESS",
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(502);
    });

    test("when provider is missing, it should return 400", async () => {
      // Act
      const response = await request
        .get("/api/v1/shipping/label/TRACK123456")
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when provider is invalid, it should return 400", async () => {
      // Act
      const response = await request
        .get("/api/v1/shipping/label/TRACK123456")
        .query({
          provider: "INVALID_PROVIDER",
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when client token is used, it should return 403", async () => {
      // Act
      const response = await request
        .get("/api/v1/shipping/label/TRACK123456")
        .query({
          provider: "WORLD_EXPRESS",
        })
        .set("authorization", "Bearer test-client-token");

      // Assert
      expect(response.status).toBe(403);
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Act
      const response = await request
        .get("/api/v1/shipping/label/TRACK123456")
        .query({
          provider: "WORLD_EXPRESS",
        });

      // Assert
      expect(response.status).toBe(401);
    });
  });
});
