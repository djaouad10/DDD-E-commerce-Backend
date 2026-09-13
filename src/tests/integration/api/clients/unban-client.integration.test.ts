import type { Container } from "#/composition/utils/container.js";
import { clearDatabase, createUserInDB } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { USER_REPOSITORY } from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { adminAuth, clientAuth } from "#/tests/helpers/auth-helpers.js";
import { userFactory } from "#/tests/helpers/domain-helpers.js";
import {
  expectOutboxEvent,
  expectOutboxEventCount,
} from "#/tests/helpers/outbox-assertions.js";

describe("PATCH /api/v1/clients/:id/status/unban", () => {
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
    test("when called with valid data and banned user exists, it should return 200 with success true", async () => {
      // Arrange
      const user = userFactory({ banned: true });
      await createUserInDB(container, user);

      // Act
      const response = await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when user does not exist, it should return 404", async () => {
      // Arrange
      const user = userFactory({ banned: true }); // not saved in DB
      // Act
      const response = await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when called with invalid id format, it should return 400", async () => {
      // Act
      const response = await request
        .patch("/api/v1/clients/invalid-id/status/unban")
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when user is not banned, calling unban should still succeed (idempotent)", async () => {
      // Arrange
      const user = userFactory({ banned: false });
      await createUserInDB(container, user);

      // Act
      const response = await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when client token is used (non-admin), it should return 403", async () => {
      // Arrange
      const user = userFactory({ banned: true });
      await createUserInDB(container, user);

      // Act
      const response = await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", clientAuth());

      // Assert
      expect(response.status).toBe(403);
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const user = userFactory({ banned: true });
      await createUserInDB(container, user);

      // Act
      const response = await request.patch(
        `/api/v1/clients/${user.id.value}/status/unban`,
      );

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should unban the user", async () => {
      // Arrange
      const user = userFactory({ banned: true });
      await createUserInDB(container, user);

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", adminAuth());

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.isBanned()).toBe(false);
    });

    test("when called with valid data, it should clear the ban reason", async () => {
      // Arrange
      const user = userFactory({ banned: true });
      await createUserInDB(container, user);

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", adminAuth());

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.isBanned()).toBe(false);
      expect(updatedUser!.getBanReason()).toBeNull();
    });

    test("when called with valid data, it should clear the ban expiration date", async () => {
      // Arrange
      const user = userFactory({ banned: true });
      await createUserInDB(container, user);

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", adminAuth());

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.isBanned()).toBe(false);
      expect(updatedUser!.getBanExpires()).toBeNull();
    });

    test("when user is not banned, calling unban should keep user in unbanned state", async () => {
      // Arrange
      const user = userFactory({ banned: false });
      await createUserInDB(container, user);

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", adminAuth());

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.isBanned()).toBe(false);
      expect(updatedUser!.getBanReason()).toBeNull();
      expect(updatedUser!.getBanExpires()).toBeNull();
    });
  });

  describe("Event Persistence", () => {
    test("when called with valid data, it should persist UserUnBanned event to outbox", async () => {
      // Arrange
      const user = userFactory({ banned: true });
      await createUserInDB(container, user);

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEvent(
        container,
        DomainEventCode.USER_UNBANNED,
        user.id.value,
      );
    });

    test("when called with valid data, exactly one UserUnBanned event should be persisted", async () => {
      // Arrange
      const user = userFactory({ banned: true });
      await createUserInDB(container, user);

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEventCount(container, DomainEventCode.USER_UNBANNED, 1);
    });

    test("when user is not banned, calling unban should not persist any UserUnBanned event", async () => {
      // Arrange
      const user = userFactory({ banned: false });
      await createUserInDB(container, user);

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", adminAuth());

      // Assert
      await expectOutboxEventCount(container, DomainEventCode.USER_UNBANNED, 0);
    });
  });

  describe("Edge Cases / Idempotency", () => {
    test("when user is already unbanned, calling unban again should succeed (idempotent)", async () => {
      // Arrange
      const user = userFactory({ banned: false });
      await createUserInDB(container, user);

      // First unban (should succeed even though user is not banned)
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", adminAuth());

      // Act - Second unban attempt
      const response = await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });

      // Verify user is still unbanned
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);
      expect(updatedUser!.isBanned()).toBe(false);
    });

    test("when unbanning a user with admin role, it should still succeed", async () => {
      // Arrange
      const adminUser = userFactory({ banned: true });
      await createUserInDB(container, adminUser);

      // Act
      const response = await request
        .patch(`/api/v1/clients/${adminUser.id.value}/status/unban`)
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });

      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(adminUser.id);
      expect(updatedUser!.isBanned()).toBe(false);
    });
  });
});
