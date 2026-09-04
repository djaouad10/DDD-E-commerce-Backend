import type { Container } from "#/composition/utils/container.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import { EmailQueueOrderDeliveredHandlerService } from "./email-queue-order-delivered-handler.service.js";
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
import { EmailQueueOrderDeliveredHandlerCommand } from "#/application/commands/email-queue-handlers/email-queue-order-delivered-handler.command.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { generateOutboxId } from "#/infrastructure/databases/outbox/utils.js";
import { ConflictError, NotFoundError } from "#/shared/errors/domain-error.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { OrderId } from "#/domain/value-objects/order-id.js";

describe("EmailQueueOrderDeliveredHandlerService", () => {
  let container: Container;
  let service: EmailQueueOrderDeliveredHandlerService;
  let emailGatewayMock: { sendEmail: Mock };

  beforeAll(async () => {
    const testApp = await createTestApp();
    container = testApp.container;

    const db = container.resolveSingleton(DB);
    const userRepo = container.resolveSingleton(USER_REPOSITORY);
    const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
    const idempotencyRepo = container.resolveSingleton(
      IDEMPOTENCY_KEYS_REPOSITORY,
    );

    // Mock external gateway, never send real emails in tests
    emailGatewayMock = { sendEmail: vitest.fn().mockResolvedValue(undefined) };

    service = new EmailQueueOrderDeliveredHandlerService(
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.confirm();
      orderFromDB!.markAsPreTransit();
      orderFromDB!.markAsShipping();
      orderFromDB!.markAsDelivered();

      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new EmailQueueOrderDeliveredHandlerCommand(
        DomainEventCode.ORDER_DELIVERED,
        new Date(),
        orderFromDB!.id.value,
        user.id.value,
        new Date(),
        orderFromDB!.getSelectedShippingProvider(),
      );

      const jobId = generateOutboxId();

      // Act
      await service.execute(command, jobId);

      // Assert
      expect(emailGatewayMock.sendEmail).toHaveBeenCalledTimes(1);
      expect(emailGatewayMock.sendEmail).toHaveBeenCalledWith(
        user.email,
        "Order Delivered",
        expect.any(String),
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
      expect(key!.handlerName).toBe("EmailQueueOrderDeliveredHandlerService");
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.confirm();
      orderFromDB!.markAsPreTransit();
      orderFromDB!.markAsShipping();
      orderFromDB!.markAsDelivered();

      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new EmailQueueOrderDeliveredHandlerCommand(
        DomainEventCode.ORDER_DELIVERED,
        new Date(),
        orderFromDB!.id.value,
        user.id.value,
        new Date(),
        orderFromDB!.getSelectedShippingProvider(),
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.confirm();
      orderFromDB!.markAsPreTransit();
      orderFromDB!.markAsShipping();
      orderFromDB!.markAsDelivered();

      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new EmailQueueOrderDeliveredHandlerCommand(
        DomainEventCode.ORDER_DELIVERED,
        new Date(),
        orderFromDB!.id.value,
        UserId.generate().value, // non existent user
        new Date(),
        orderFromDB!.getSelectedShippingProvider(),
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.confirm();
      orderFromDB!.markAsPreTransit();
      orderFromDB!.markAsShipping();
      orderFromDB!.markAsDelivered();

      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new EmailQueueOrderDeliveredHandlerCommand(
        DomainEventCode.ORDER_DELIVERED,
        new Date(),
        OrderId.generate().value, // non existent order
        user.id.value,
        new Date(),
        orderFromDB!.getSelectedShippingProvider(),
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.confirm();
      orderFromDB!.markAsPreTransit();
      orderFromDB!.markAsShipping();
      orderFromDB!.markAsDelivered();

      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new EmailQueueOrderDeliveredHandlerCommand(
        DomainEventCode.ORDER_DELIVERED,
        new Date(),
        orderFromDB!.id.value,
        user.id.value,
        new Date(),
        orderFromDB!.getSelectedShippingProvider(),
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
