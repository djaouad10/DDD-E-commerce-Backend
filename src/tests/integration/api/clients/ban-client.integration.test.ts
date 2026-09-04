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
import type { UserBanned } from "#/domain/events/user/user-banned.js";

describe("PATCH /api/v1/clients/:id/status/ban", () => {
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
    test("when called with valid data and user exists, it should return 200 with success true", async () => {
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
        .patch(`/api/v1/clients/${user.id.value}/status/ban`)
        .send({
          reason: "Spam activity",
          banExpiresInSeconds: 86400, // 24 hours
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called without banExpiresInSeconds, it should return 200 with success true (permanent ban)", async () => {
      // Arrange
      const user = User.create(
        "Jane Doe",
        "jane@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      // Act
      const response = await request
        .patch(`/api/v1/clients/${user.id.value}/status/ban`)
        .send({
          reason: "Permanent ban",
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when called without reason, it should return 200 with success true", async () => {
      // Arrange
      const user = User.create(
        "Bob Smith",
        "bob@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      // Act
      const response = await request
        .patch(`/api/v1/clients/${user.id.value}/status/ban`)
        .send({
          banExpiresInSeconds: 3600,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when user does not exist, it should return 404", async () => {
      // Act
      const response = await request
        .patch(`/api/v1/clients/${UserId.generate().value}/status/ban`)
        .send({
          reason: "Spam",
          banExpiresInSeconds: 86400,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when called with invalid id format, it should return 400", async () => {
      // Act
      const response = await request
        .patch("/api/v1/clients/invalid-id/status/ban")
        .send({
          reason: "Spam",
          banExpiresInSeconds: 86400,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when called with invalid banExpiresInSeconds (negative), it should return 400", async () => {
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
        .patch(`/api/v1/clients/${user.id.value}/status/ban`)
        .send({
          reason: "Spam",
          banExpiresInSeconds: -100,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when client token is used (non-admin), it should return 403", async () => {
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
        .patch(`/api/v1/clients/${user.id.value}/status/ban`)
        .send({
          reason: "Spam",
          banExpiresInSeconds: 86400,
        })
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
        false,
      );
      await createUserInDB(container, user);

      // Act
      const response = await request
        .patch(`/api/v1/clients/${user.id.value}/status/ban`)
        .send({
          reason: "Spam",
          banExpiresInSeconds: 86400,
        });

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe("New State Validation", () => {
    test("when called with valid data, it should ban the user", async () => {
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
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/ban`)
        .send({
          reason: "Spam activity",
          banExpiresInSeconds: 86400,
        })
        .set("authorization", "Bearer test-admin-token");

      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.isBanned()).toBe(true);
    });

    test("when called with banExpiresInSeconds, it should set the ban expiration date", async () => {
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

      const banExpiresInSeconds = 86400; // 24 hours
      const expectedExpiry = new Date(Date.now() + banExpiresInSeconds * 1000);

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/ban`)
        .send({
          reason: "Spam activity",
          banExpiresInSeconds,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.isBanned()).toBe(true);

      const banExpires = updatedUser!.getBanExpires();
      expect(banExpires).toBeInstanceOf(Date);
      expect(banExpires!.getTime()).toBeCloseTo(expectedExpiry.getTime(), -3); // Within ~1 second
    });

    test("when called without banExpiresInSeconds, it should set a permanent ban (no expiry)", async () => {
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
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/ban`)
        .send({
          reason: "Permanent ban",
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.isBanned()).toBe(true);
      expect(updatedUser!.getBanExpires()).toBeNull();
    });

    test("when called with valid data, it should store the ban reason", async () => {
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

      const banReason = "Violation of terms of service";

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/ban`)
        .send({
          reason: banReason,
          banExpiresInSeconds: 86400,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.isBanned()).toBe(true);
      // Assuming there's a getBanReason() method
      expect(updatedUser!.getBanReason()).toBe(banReason);
    });
  });

  describe("Event Persistence", () => {
    test("when called with valid data, it should persist UserBanned event to outbox", async () => {
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

      const banReason = "Spam activity";
      const banExpiresInSeconds = 86400;

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/ban`)
        .send({
          reason: banReason,
          banExpiresInSeconds,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const userBannedEvent = events.find(
        (e) => e.eventType === DomainEventCode.USER_BANNED,
      );
      expect(userBannedEvent).toBeDefined();
      expect(userBannedEvent!.aggregateId).toBe(user.id.value);
      expect((userBannedEvent!.payload as UserBanned).banReason).toBe(
        banReason,
      );
      // Verify the banExpires is set correctly (not null)
      expect(
        (userBannedEvent!.payload as UserBanned).banExpires,
      ).not.toBeNull();
    });

    test("when called without banExpiresInSeconds, it should persist UserBanned event with null banExpires", async () => {
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

      const banReason = "Permanent ban";

      // Act
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/ban`)
        .send({
          reason: banReason,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const userBannedEvent = events.find(
        (e) => e.eventType === DomainEventCode.USER_BANNED,
      );
      expect(userBannedEvent).toBeDefined();
      expect(userBannedEvent!.aggregateId).toBe(user.id.value);
      expect((userBannedEvent!.payload as UserBanned).banReason).toBe(
        banReason,
      );
      // For permanent ban, banExpires should be null
      expect((userBannedEvent!.payload as UserBanned).banExpires).toBeNull();
    });

    test("when called without reason, it should persist UserBanned event with null reason", async () => {
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
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/ban`)
        .send({
          banExpiresInSeconds: 86400,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const userBannedEvent = events.find(
        (e) => e.eventType === DomainEventCode.USER_BANNED,
      );
      expect(userBannedEvent).toBeDefined();
      expect(userBannedEvent!.aggregateId).toBe(user.id.value);
      expect((userBannedEvent!.payload as UserBanned).banReason).toBeNull();
      expect(
        (userBannedEvent!.payload as UserBanned).banExpires,
      ).not.toBeNull();
    });

    test("when called with valid data, exactly one UserBanned event should be persisted", async () => {
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
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/ban`)
        .send({
          reason: "Spam activity",
          banExpiresInSeconds: 86400,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const userBannedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.USER_BANNED,
      );
      expect(userBannedEvents).toHaveLength(1);
    });
  });

  describe("Idempotency / Edge Cases", () => {
    test("when user is already banned, calling the endpoint again should still succeed (idempotent)", async () => {
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

      // First ban
      await request
        .patch(`/api/v1/clients/${user.id.value}/status/ban`)
        .send({
          reason: "First ban reason",
          banExpiresInSeconds: 3600,
        })
        .set("authorization", "Bearer test-admin-token");

      // Act - Second ban attempt
      const response = await request
        .patch(`/api/v1/clients/${user.id.value}/status/ban`)
        .send({
          reason: "Second ban reason",
          banExpiresInSeconds: 7200,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when banning a user with admin role, it should still succeed", async () => {
      // Arrange
      const adminUser = User.create(
        "Admin User",
        "admin@example.com",
        "ADMIN",
        null,
        true,
        false,
      );
      await createUserInDB(container, adminUser);

      // Act
      const response = await request
        .patch(`/api/v1/clients/${adminUser.id.value}/status/ban`)
        .send({
          reason: "Admin misconduct",
          banExpiresInSeconds: 86400,
        })
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });
  });
});
