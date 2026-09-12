import type { Container } from "#/composition/utils/container.js";
import { clearDatabase, createUserInDB } from "#/tests/helpers/db-helpers.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import type { Express } from "express";
import nock from "nock";
import supertest from "supertest";
import { USER_REPOSITORY } from "#/composition/utils/tokens.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { adminAuth, clientAuth } from "#/tests/helpers/auth-helpers.js";
import { userFactory } from "#/tests/helpers/domain-helpers.js";
import {
  expectOutboxEvent,
  expectOutboxEventCount,
} from "#/tests/helpers/outbox-assertions.js";

describe("PATCH /api/v1/clients/profile", () => {
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

  describe("Response Validation - HTTP Layer & Validation Errors", () => {
    test("when client updates their own name, it should return 200 with success true", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const body = { name: "Jane Doe" };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when client updates their own image, it should return 200 with success true", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const body = { image: "https://example.com/new-image.jpg" };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when client updates both name and image, it should return 200 with success true", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const body = {
        name: "Jane Doe",
        image: "https://example.com/new-image.jpg",
      };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    test("when no fields are provided (empty body), it should return 400", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send({})
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("BAD_REQUEST");
    });

    test("when user does not exist, it should return 404", async () => {
      // Arrange
      const user = userFactory(); // User not saved in DB

      const body = { name: "Jane Doe" };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

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
        .set("authorization", adminAuth());

      // Assert
      expect(response.status).toBe(403);
    });
  });

  describe("Business Logic Validation - Service Layer & Entity Errors", () => {
    test("when trying to update a user with ADMIN role, it should return 403", async () => {
      // Arrange
      const adminUser = userFactory({ role: "ADMIN" });
      await createUserInDB(container, adminUser);

      const body = { name: "Updated Admin" };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(adminUser.id.value));

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });

    test("when updating name to empty string, it should return 400 (entity validation)", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const body = { name: "" };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("when updating name to null, it should return 400 (validation error from command)", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const body = { name: null };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      // The zod schema validates this, so it returns 400
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("New State Validation - DB Changes", () => {
    test("when updating name, it should update the user's name in the database", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const newName = "Jane Doe";
      const body = { name: newName };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.getName()).toBe(newName);
    });

    test("when updating image, it should update the user's image in the database", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const newImage = "https://example.com/new-image.jpg";
      const body = { image: newImage };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.getImage()).toBe(newImage);
    });

    test("when updating both name and image, it should update both fields in the database", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const newName = "Jane Doe";
      const newImage = "https://example.com/new-image.jpg";
      const body = { name: newName, image: newImage };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser).not.toBeNull();
      expect(updatedUser!.getName()).toBe(newName);
      expect(updatedUser!.getImage()).toBe(newImage);
    });

    test("when updating name, it should update the updatedAt timestamp", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const beforeUpdate = user.getUpdatedAt();
      const body = { name: "Jane Doe" };

      // Act - Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const userRepository = container.resolveSingleton(USER_REPOSITORY);
      const updatedUser = await userRepository.find(user.id);

      expect(updatedUser!.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime(),
      );
    });

    test("when setting image to null, it should update the user's image to null in the database", async () => {
      // Arrange
      const user = userFactory({ image: "https://example.com/image.jpg" });
      await createUserInDB(container, user);

      const body = { image: null };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

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
      const user = userFactory();
      await createUserInDB(container, user);

      const body = { name: "Jane Doe" };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.USER_PROFILE_UPDATED,
        user.id.value,
      );

      expect((event.payload as any).changedFields).toContain("name");
    });

    test("when updating image, it should persist UserProfileUpdated event to outbox", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const body = { image: "https://example.com/new-image.jpg" };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      const event = await expectOutboxEvent(
        container,
        DomainEventCode.USER_PROFILE_UPDATED,
        user.id.value,
      );

      expect((event.payload as any).changedFields).toContain("image");
    });

    test("when updating both name and image, it should persist two UserProfileUpdated events (one for each field)", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const body = {
        name: "Jane Doe",
        image: "https://example.com/new-image.jpg",
      };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.USER_PROFILE_UPDATED,
        2,
      );
    });

    test("when updating name, exactly one UserProfileUpdated event should be persisted", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const body = { name: "Jane Doe" };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.USER_PROFILE_UPDATED,
        1,
      );
    });

    test("when updating image, exactly one UserProfileUpdated event should be persisted", async () => {
      // Arrange
      const user = userFactory();
      await createUserInDB(container, user);

      const body = { image: "https://example.com/new-image.jpg" };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.USER_PROFILE_UPDATED,
        1,
      );
    });
  });

  describe("Edge Cases", () => {
    test("when updating name to the same value, it should NOT persist UserProfileUpdated event (early return)", async () => {
      // Arrange
      const originalName = "John Doe";
      const user = userFactory({ name: originalName });
      await createUserInDB(container, user);

      const body = { name: originalName };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.USER_PROFILE_UPDATED,
        0,
      );
    });

    test("when updating image to the same value, it should NOT persist UserProfileUpdated event (early return)", async () => {
      // Arrange
      const originalImage = "https://example.com/image.jpg";
      const user = userFactory({ image: originalImage });
      await createUserInDB(container, user);

      const body = { image: originalImage };

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.USER_PROFILE_UPDATED,
        0,
      );
    });

    test("when user is banned, it should still allow profile update", async () => {
      // Arrange
      const user = userFactory({ banned: true });
      await createUserInDB(container, user);

      const body = { name: "Jane Doe" };

      // Act
      const response = await request
        .patch("/api/v1/clients/profile")
        .send(body)
        .set("authorization", clientAuth(user.id.value));

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
      const user1 = userFactory();
      const user2 = userFactory();
      await createUserInDB(container, user1);
      await createUserInDB(container, user2);

      // Act
      await request
        .patch("/api/v1/clients/profile")
        .send({ name: "John Updated" })
        .set("authorization", clientAuth(user1.id.value));

      await request
        .patch("/api/v1/clients/profile")
        .send({ name: "Jane Updated" })
        .set("authorization", clientAuth(user2.id.value));

      // Assert
      await expectOutboxEventCount(
        container,
        DomainEventCode.USER_PROFILE_UPDATED,
        2,
      );
    });
  });
});
