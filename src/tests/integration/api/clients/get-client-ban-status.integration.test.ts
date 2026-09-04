import type { Container } from "#/composition/utils/container.js";
import { clearDatabase, createUserInDB } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { User } from "#/domain/entities/user.js";
import { UserId } from "#/domain/value-objects/user-id.js";

describe("GET /api/v1/clients/ban-status/:id", () => {
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
    test("when client is not banned, it should return 200 with banned false", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      // Act
      const response = await request
        .get(`/api/v1/clients/ban-status/${user.id.value}`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ banned: false });
    });

    test("when client is banned, it should return 200 with banned true", async () => {
      // Arrange
      const user = User.create(
        "Jane Doe",
        "jane@example.com",
        "CLIENT",
        null,
        true,
        true,
      );
      await createUserInDB(container, user);

      // Act
      const response = await request
        .get(`/api/v1/clients/ban-status/${user.id.value}`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ banned: true });
    });

    test("when user does not exist, it should return 404", async () => {
      // Act
      const response = await request
        .get(`/api/v1/clients/ban-status/${UserId.generate().value}`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });
});
