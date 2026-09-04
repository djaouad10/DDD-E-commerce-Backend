import type { Container } from "#/composition/utils/container.js";
import { clearDatabase, createUserInDB } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import nock from "nock";
import supertest from "supertest";
import type { Express } from "express";
import { User } from "#/domain/entities/user.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import {
  OUTBOX_REPOSITORY,
  USER_REPOSITORY,
} from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import type { UserUnBanned } from "#/domain/events/user/user-unbanned.js";

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
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        true, // Banned
      );
      await createUserInDB(container, user);

      // Act
      const response = await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when user does not exist, it should return 404", async () => {
      // Act
      const response = await request
        .patch(`/api/v1/clients/${UserId.generate().value}/status/unban`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when called with invalid id format, it should return 400", async () => {
      // Act
      const response = await request
        .patch("/api/v1/clients/invalid-id/status/unban")
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when user is not banned, calling unban should still succeed (idempotent)", async () => {
      // Arrange
      const user = User.create(
        "Jane Doe",
        "jane@example.com",
        "CLIENT",
        null,
        true,
        false, // Not banned
      );
      await createUserInDB(container, user);

      // Act
      const response = await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when client token is used (non-admin), it should return 403", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        true,
      );
      await createUserInDB(container, user);

      // Act
      const response = await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", "Bearer test-client-token");

      // Assert
      expect(response.status).toBe(403);
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        true,
      );
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
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        true, // Banned
      );
      await createUserInDB(container, user);

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.isBanned()).toBe(false);
    });

    test("when called with valid data, it should clear the ban reason", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        true, // Banned
      );
      await createUserInDB(container, user);

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.isBanned()).toBe(false);
      expect(updatedUser!.getBanReason()).toBeNull();
    });

    test("when called with valid data, it should clear the ban expiration date", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        true, // Banned
      );
      await createUserInDB(container, user);

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.isBanned()).toBe(false);
      expect(updatedUser!.getBanExpires()).toBeNull();
    });

    test("when user is not banned, calling unban should keep user in unbanned state", async () => {
      // Arrange
      const user = User.create(
        "Jane Doe",
        "jane@example.com",
        "CLIENT",
        null,
        true,
        false, // Not banned
      );
      await createUserInDB(container, user);

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", "Bearer test-admin-token");

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
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        true, // Banned
      );
      await createUserInDB(container, user);

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const userUnBannedEvent = events.find(
        (e) => e.eventType === DomainEventCode.USER_UNBANNED,
      );
      expect(userUnBannedEvent).toBeDefined();
      expect(userUnBannedEvent!.aggregateId).toBe(user.id.value);
      expect((userUnBannedEvent!.payload as UserUnBanned).aggregateId).toBe(
        user.id.value,
      );
    });

    test("when called with valid data, exactly one UserUnBanned event should be persisted", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        true, // Banned
      );
      await createUserInDB(container, user);

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const userUnBannedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.USER_UNBANNED,
      );
      expect(userUnBannedEvents).toHaveLength(1);
    });

    test("when user is not banned, calling unban should not persist any UserUnBanned event", async () => {
      // Arrange
      const user = User.create(
        "Jane Doe",
        "jane@example.com",
        "CLIENT",
        null,
        true,
        false, // Not banned
      );
      await createUserInDB(container, user);

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const userUnBannedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.USER_UNBANNED,
      );
      expect(userUnBannedEvents).toHaveLength(0);
    });
  });

  describe("Edge Cases / Idempotency", () => {
    test("when user is already unbanned, calling unban again should succeed (idempotent)", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false, // Not banned
      );
      await createUserInDB(container, user);

      // First unban (should succeed even though user is not banned)
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", "Bearer test-admin-token");

      // Act - Second unban attempt
      const response = await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", "Bearer test-admin-token");

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
      const adminUser = User.create(
        "Admin User",
        "admin@example.com",
        "ADMIN",
        null,
        true,
        true, // Banned
      );
      await createUserInDB(container, adminUser);

      // Act
      const response = await request
        .patch(`/api/v1/clients/${adminUser.id.value}/status/unban`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });

      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(adminUser.id);
      expect(updatedUser!.isBanned()).toBe(false);
    });

    test("when unbanning a user that was banned with expiry, it should clear the expiry", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        true, // Banned
      );
      await createUserInDB(container, user);

      // First, verify user is banned with some expiry
      let userRepository = container.resolveSingleton(USER_REPOSITORY);
      let foundUser = await userRepository.find(user.id);
      expect(foundUser!.isBanned()).toBe(true);

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/unban`)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const updatedUser = await userRepository.find(user.id);
      expect(updatedUser!.isBanned()).toBe(false);
      expect(updatedUser!.getBanExpires()).toBeNull();
      expect(updatedUser!.getBanReason()).toBeNull();
    });
  });
});
