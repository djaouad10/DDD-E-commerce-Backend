import type { Container } from "#/composition/container.js";
import { clearDatabase, createUserInDB } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { User } from "#/domain/entities/user.js";
import { USER_REPOSITORY, OUTBOX_REPOSITORY } from "#/composition/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";

describe("PATCH /api/v1/clients/profile", () => {
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

  describe("Response Validation - HTTP Layer & Validation Errors", () => {
    test("when client updates their own name, it should return 200 with success true", async () => {
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

      const body = { name: "Jane Doe" };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when client updates their own image, it should return 200 with success true", async () => {
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

      const body = { image: "https://example.com/new-image.jpg" };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when client updates both name and image, it should return 200 with success true", async () => {
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

      const body = {
        name: "Jane Doe",
        image: "https://example.com/new-image.jpg",
      };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when no fields are provided (empty body), it should return 400", async () => {
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
        .patch("/api/v1/clients/profile")
        .send({})
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("BAD_REQUEST");
    });

    test("when user does not exist, it should return 404", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      // User not saved in DB

      const body = { name: "Jane Doe" };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("when no auth token is provided, it should return 401", async () => {
      // Arrange
      const body = { name: "Jane Doe" };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body);

      // Assert
      expect(response.status).toBe(401);
    });

    test("when admin token is used, it should return 403", async () => {
      // Arrange
      const body = { name: "Jane Doe" };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", "Bearer test-admin-token");

      // Assert
      expect(response.status).toBe(403);
    });
  });

  describe("Business Logic Validation - Service Layer & Entity Errors", () => {
    test("when trying to update a user with ADMIN role, it should return 403", async () => {
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

      const body = { name: "Updated Admin" };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${adminUser.id.value}`);

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });

    test("when updating name to empty string, it should return 400 (entity validation)", async () => {
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

      const body = { name: "" };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when updating name to null, it should return 400 (validation error from command)", async () => {
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

      const body = { name: null };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      // The zod schema validates this, so it returns 400
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("New State Validation - DB Changes", () => {
    test("when updating name, it should update the user's name in the database", async () => {
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

      const newName = "Jane Doe";
      const body = { name: newName };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.getName()).toBe(newName);
    });

    test("when updating image, it should update the user's image in the database", async () => {
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

      const newImage = "https://example.com/new-image.jpg";
      const body = { image: newImage };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.getImage()).toBe(newImage);
    });

    test("when updating both name and image, it should update both fields in the database", async () => {
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

      const newName = "Jane Doe";
      const newImage = "https://example.com/new-image.jpg";
      const body = { name: newName, image: newImage };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.getName()).toBe(newName);
      expect(updatedUser!.getImage()).toBe(newImage);
    });

    test("when updating name, it should update the updatedAt timestamp", async () => {
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

      const beforeUpdate = user.getUpdatedAt();
      const body = { name: "Jane Doe" };

      // Act - Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser!.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime(),
      );
    });

    test("when setting image to null, it should update the user's image to null in the database", async () => {
      // Arrange
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        "https://example.com/old-image.jpg",
        true,
        false,
      );
      await createUserInDB(container, user);

      const body = { image: null };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);

      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser!.getImage()).toBeNull();
    });
  });

  describe("Event Persistence - Outbox", () => {
    test("when updating name, it should persist UserProfileUpdated event to outbox", async () => {
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

      const body = { name: "Jane Doe" };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const userProfileUpdatedEvent = events.find(
        (e) => e.eventType === DomainEventCode.USER_PROFILE_UPDATED,
      );
      expect(userProfileUpdatedEvent).toBeDefined();
      expect(userProfileUpdatedEvent!.aggregateId).toBe(user.id.value);

      const payload = userProfileUpdatedEvent!.payload as any;
      expect(payload.changedFields).toContain("name");
    });

    test("when updating image, it should persist UserProfileUpdated event to outbox", async () => {
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

      const body = { image: "https://example.com/new-image.jpg" };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const userProfileUpdatedEvent = events.find(
        (e) => e.eventType === DomainEventCode.USER_PROFILE_UPDATED,
      );
      expect(userProfileUpdatedEvent).toBeDefined();
      expect(userProfileUpdatedEvent!.aggregateId).toBe(user.id.value);

      const payload = userProfileUpdatedEvent!.payload as any;
      expect(payload.changedFields).toContain("image");
    });

    test("when updating both name and image, it should persist two UserProfileUpdated events (one for each field)", async () => {
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

      const body = {
        name: "Jane Doe",
        image: "https://example.com/new-image.jpg",
      };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const userProfileUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.USER_PROFILE_UPDATED,
      );
      expect(userProfileUpdatedEvents).toHaveLength(2);

      const allFields = userProfileUpdatedEvents.flatMap(
        (e) => (e.payload as any).changedFields,
      );
      expect(allFields).toContain("name");
      expect(allFields).toContain("image");
    });

    test("when updating name, exactly one UserProfileUpdated event should be persisted", async () => {
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

      const body = { name: "Jane Doe" };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const userProfileUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.USER_PROFILE_UPDATED,
      );
      expect(userProfileUpdatedEvents).toHaveLength(1);
    });

    test("when updating image, exactly one UserProfileUpdated event should be persisted", async () => {
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

      const body = { image: "https://example.com/new-image.jpg" };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      const events = await outboxRepository.getPendingEvents(100);

      const userProfileUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.USER_PROFILE_UPDATED,
      );
      expect(userProfileUpdatedEvents).toHaveLength(1);
    });
  });

  describe("Edge Cases", () => {
    test("when updating name to the same value, it should NOT persist UserProfileUpdated event (early return)", async () => {
      // Arrange
      const originalName = "John Doe";
      const user = User.create(
        originalName,
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      // Clear any events from creation
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      await clearDatabase(container);
      await createUserInDB(container, user);

      const body = { name: originalName };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const events = await outboxRepository.getPendingEvents(100);

      const userProfileUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.USER_PROFILE_UPDATED,
      );
      expect(userProfileUpdatedEvents).toHaveLength(0);
    });

    test("when updating image to the same value, it should NOT persist UserProfileUpdated event (early return)", async () => {
      // Arrange
      const originalImage = "https://example.com/image.jpg";
      const user = User.create(
        "John Doe",
        "john@example.com",
        "CLIENT",
        originalImage,
        true,
        false,
      );
      await createUserInDB(container, user);

      // Clear any events from creation
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      await clearDatabase(container);
      await createUserInDB(container, user);

      const body = { image: originalImage };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const events = await outboxRepository.getPendingEvents(100);

      const userProfileUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.USER_PROFILE_UPDATED,
      );
      expect(userProfileUpdatedEvents).toHaveLength(0);
    });

    test("when updating name to a new value, it should persist UserProfileUpdated event", async () => {
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

      // Clear any events from creation
      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      await clearDatabase(container);
      await createUserInDB(container, user);

      const body = { name: "Jane Doe" };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      const events = await outboxRepository.getPendingEvents(100);

      const userProfileUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.USER_PROFILE_UPDATED,
      );
      expect(userProfileUpdatedEvents).toHaveLength(1);
      expect(
        (userProfileUpdatedEvents[0]!.payload as any).changedFields,
      ).toContain("name");
    });

    test("when user is banned, it should still allow profile update", async () => {
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

      const body = { name: "Jane Doe" };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", `Bearer test-client-token ${user.id.value}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });

      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);
      expect(updatedUser!.getName()).toBe("Jane Doe");
      expect(updatedUser!.isBanned()).toBe(true); // Still banned
    });

    test("when multiple clients update their profiles, each should have their own events", async () => {
      // Arrange
      const user1 = User.create(
        "John Doe",
        "john1@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      const user2 = User.create(
        "Jane Doe",
        "john2@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user1);
      await createUserInDB(container, user2);

      const outboxRepository = container.resolveSingleton(OUTBOX_REPOSITORY);
      await clearDatabase(container);
      await createUserInDB(container, user1);
      await createUserInDB(container, user2);

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send({ name: "John Updated" })
        .set("authorization", `Bearer test-client-token ${user1.id.value}`);

      await request
        .patch("/api/v1/clients/profile")
        .send({ name: "Jane Updated" })
        .set("authorization", `Bearer test-client-token ${user2.id.value}`);

      // Assert
      const events = await outboxRepository.getPendingEvents(100);

      const userProfileUpdatedEvents = events.filter(
        (e) => e.eventType === DomainEventCode.USER_PROFILE_UPDATED,
      );
      expect(userProfileUpdatedEvents).toHaveLength(2);

      const aggregateIds = userProfileUpdatedEvents.map((e) => e.aggregateId);
      expect(aggregateIds).toContain(user1.id.value);
      expect(aggregateIds).toContain(user2.id.value);
    });
  });
});
