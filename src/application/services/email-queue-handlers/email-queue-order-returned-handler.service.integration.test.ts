import type { Container } from "#/composition/utils/container.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import { EmailQueueOrderReturnedHandlerService } from "./email-queue-order-returned-handler.service.js";
import {
  clearDatabase,
  createUserInDB,
  findIdempotencyKeyInDB,
  setupOrderInDB,
} from "#/tests/helpers/db-helpers.js";
import type { Mock } from "vitest";
import {
  DB,
  IDEMPOTENCY_KEYS_REPOSITORY,
  ORDER_REPOSITORY,
  USER_REPOSITORY,
} from "#/composition/utils/tokens.js";
import { User } from "#/domain/entities/user.js";
import { EmailQueueOrderReturnedHandlerCommand } from "#/application/commands/email-queue-handlers/email-queue-order-returned-handler.command.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { generateOutboxId } from "#/infrastructure/databases/outbox/utils.js";
import { ConflictError, NotFoundError } from "#/shared/errors/domain-error.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { OrderId } from "#/domain/value-objects/order-id.js";

describe("EmailQueueOrderReturnedHandlerService", () => {
  let container: Container;
  let service: EmailQueueOrderReturnedHandlerService;
  let emailGatewayMock: { sendEmail: Mock };

  beforeAll(async () => {
    const testApp = createTestApp();
    container = testApp.container;

    const db = container.resolveSingleton(DB);
    const userRepo = container.resolveSingleton(USER_REPOSITORY);
    const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
    const idempotencyRepo = container.resolveSingleton(
      IDEMPOTENCY_KEYS_REPOSITORY,
    );

    // Mock external gateway, never send real emails in tests
    emailGatewayMock = { sendEmail: vitest.fn().mockResolvedValue(undefined) };

    service = new EmailQueueOrderReturnedHandlerService(
      db,
      emailGatewayMock as any,
      userRepo,
      orderRepo,
      idempotencyRepo,
    );
  });

  afterAll(async () => {
    cleanupTestApp();
  });

  beforeEach(async () => {
    await clearDatabase(container);
    emailGatewayMock.sendEmail.mockClear();
  });

  describe("Success Path", () => {
    test("when user and order exist, it should send email and persist idempotency key", async () => {
      // Arrange
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );

      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, { owner: user });

      const command = new EmailQueueOrderReturnedHandlerCommand(
        DomainEventCode.ORDER_RETURNED,
        new Date(),
        order.id.value,
        user.id.value,
        "Defective item",
        order.getSelectedShippingProvider(),
      );

      const jobId = generateOutboxId();

      // Act
      await service.execute(command, jobId);

      // Assert
      expect(emailGatewayMock.sendEmail).toHaveBeenCalledTimes(1);
      expect(emailGatewayMock.sendEmail).toHaveBeenCalledWith(
        user.email,
        "Order Returned",
        expect.any(String),
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
      expect(key!.handlerName).toBe("EmailQueueOrderReturnedHandlerService");
    });

    test("when reason is null, it should still send email and persist idempotency key", async () => {
      // Arrange
      const user = User.create(
        "Jane",
        "jane@example.com",
        "CLIENT",
        null,
        true,
        false,
      );

      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, { owner: user });

      const command = new EmailQueueOrderReturnedHandlerCommand(
        DomainEventCode.ORDER_RETURNED,
        new Date(),
        order.id.value,
        user.id.value,
        null,
        order.getSelectedShippingProvider(),
      );

      const jobId = generateOutboxId();

      // Act
      await service.execute(command, jobId);

      // Assert
      expect(emailGatewayMock.sendEmail).toHaveBeenCalledTimes(1);
      expect(emailGatewayMock.sendEmail).toHaveBeenCalledWith(
        user.email,
        "Order Returned",
        expect.any(String),
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
    });
  });

  describe("Idempotency", () => {
    test("when executed twice with same jobId, second attempt should throw", async () => {
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );

      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, { owner: user });

      const command = new EmailQueueOrderReturnedHandlerCommand(
        DomainEventCode.ORDER_RETURNED,
        new Date(),
        order.id.value,
        user.id.value,
        "Changed my mind",
        order.getSelectedShippingProvider(),
      );

      const jobId = generateOutboxId();

      await service.execute(command, jobId);

      await expect(service.execute(command, jobId)).rejects.toThrow(
        ConflictError,
      );
      expect(emailGatewayMock.sendEmail).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error Handling", () => {
    test("when user does not exist, it should throw NotFoundError", async () => {
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );

      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, { owner: user });

      const command = new EmailQueueOrderReturnedHandlerCommand(
        DomainEventCode.ORDER_RETURNED,
        new Date(),
        order.id.value,
        UserId.generate().value, // non existent user
        "Defective item",
        order.getSelectedShippingProvider(),
      );

      const jobId = generateOutboxId();

      await expect(service.execute(command, jobId)).rejects.toThrow(
        NotFoundError,
      );
      expect(emailGatewayMock.sendEmail).not.toHaveBeenCalled();
    });

    test("when order does not exist, it should throw NotFoundError", async () => {
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );

      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, { owner: user });

      const command = new EmailQueueOrderReturnedHandlerCommand(
        DomainEventCode.ORDER_RETURNED,
        new Date(),
        OrderId.generate().value, // non existent order
        user.id.value,
        "Defective item",
        order.getSelectedShippingProvider(),
      );

      const jobId = generateOutboxId();

      await expect(service.execute(command, jobId)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("Transaction Safety", () => {
    test("when email gateway throws, it should rollback and NOT persist idempotency key", async () => {
      // Arrange
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      const order = await setupOrderInDB(container, { owner: user });

      const command = new EmailQueueOrderReturnedHandlerCommand(
        DomainEventCode.ORDER_RETURNED,
        new Date(),
        order.id.value,
        user.id.value,
        "Wrong size",
        order.getSelectedShippingProvider(),
      );
      const jobId = generateOutboxId();

      emailGatewayMock.sendEmail.mockRejectedValueOnce(new Error("SMTP down"));

      // Act + Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        "SMTP down",
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).toBeNull(); // Critical: no key persisted so retry can succeed
      expect(emailGatewayMock.sendEmail).toHaveBeenCalledTimes(1);
    });
  });
});
