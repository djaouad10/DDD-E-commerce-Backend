import type { Container } from "#/composition/utils/container.js";
import { clearDatabase, createUserInDB } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { User } from "#/domain/entities/user.js";
import { UserId } from "#/domain/value-objects/user-id.js";

describe("GET /api/v1/clients/profile", () => {
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
    test("when client requests his own profile, it should return 200 with user data", async () => {
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
        .get("/api/v1/clients/profile")
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: user.id.value,
        name: user.getName(),
        email: user.email,
        role: "CLIENT",
        image: null,
        banned: false,
        createdAt: expect.any(String),
      });
    });

    test("when admin requests a client profile by id, it should return 200 with user data", async () => {
      // Arrange
      const client = User.create(
        "Jane Doe",
        "jane@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, client);

      // Act
      const response = await request
        .get("/api/v1/clients/profile")
        .query({ id: client.id.value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: client.id.value,
        name: client.getName(),
        email: client.email,
        role: "CLIENT",
        image: null,
        banned: false,
        createdAt: expect.any(String),
      });
    });

    test("when user does not exist, it should return 404", async () => {
      // Arrange: user not created in DB

      // Act
      const response = await request
        .get("/api/v1/clients/profile")
        .set(
          "authorization",
          `Bearer test-client-token ${UserId.generate().value}`,
        );

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when admin requests non-existent client, it should return 404", async () => {
      // Act
      const response = await request
        .get("/api/v1/clients/profile")
        .query({ id: UserId.generate().value })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });
});
