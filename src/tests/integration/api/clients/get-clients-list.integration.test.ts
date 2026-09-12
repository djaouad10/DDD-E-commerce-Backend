import type { Container } from "#/composition/utils/container.js";
import { clearDatabase, createUserInDB } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import type { UserCursor } from "#/application/read-models/user.queries.js";
import { adminAuth } from "#/tests/helpers/auth-helpers.js";
import { userFactory } from "#/tests/helpers/domain-helpers.js";

describe("GET /api/v1/clients", () => {
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
    test("when called with valid params, it should return 200 with paginated clients list", async () => {
      // Arrange
      const now = new Date();
      const client1 = userFactory();
      const client2 = userFactory();
      const admin = userFactory({ role: "ADMIN" });

      // Create with explicit staggered timestamps
      await createUserInDB(container, client1, new Date(now.getTime() - 2000));
      await createUserInDB(container, client2, new Date(now.getTime() - 1000));
      await createUserInDB(container, admin, now);

      // Act
      const response = await request
        .get("/api/v1/clients")
        .query({ limit: 1, role: "CLIENT" })
        .set("authorization", adminAuth());

      // Assert — client2 is more recent, so appears first with desc order
      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].id).toBe(client2.id.value);
      expect(response.body.nextCursor).toBeDefined();
    });

    test("when filtering by ADMIN role, it should return only admins", async () => {
      // Arrange
      const client = userFactory();
      const admin = userFactory({ role: "ADMIN" });

      await createUserInDB(container, client);
      await createUserInDB(container, admin);

      // Act
      const response = await request
        .get("/api/v1/clients")
        .query({ limit: 10, role: "ADMIN" })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0]).toMatchObject({
        id: admin.id.value,
        role: "ADMIN",
      });
    });

    test("when using cursor, it should return next page", async () => {
      // Arrange
      const client1 = userFactory();
      const client2 = userFactory();

      await createUserInDB(container, client1);
      await createUserInDB(container, client2);

      const firstPage = await request
        .get("/api/v1/clients")
        .query({ limit: 1, role: "CLIENT" })
        .set("authorization", adminAuth());

      const cursor: UserCursor = firstPage.body.nextCursor;

      // Act
      const response = await request
        .get("/api/v1/clients")
        .query({
          limit: 1,
          role: "CLIENT",
          cursor: {
            createdAt: cursor.createdAt,
            userId: cursor.userId,
          },
        })
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.users).toHaveLength(1);
    });

    test.each([
      ["limit", { limit: 0, role: "CLIENT" }],
      ["role", { limit: 10, role: "INVALID_ROLE" }],
    ])(
      "when %s is invalid, it should return 400",
      async (_invalidParam, query) => {
        // Act
        const response = await request
          .get("/api/v1/clients")
          .query(query)
          .set("authorization", adminAuth());

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe("VALIDATION_ERROR");
      },
    );
  });
});
