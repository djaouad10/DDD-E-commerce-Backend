import type { Container } from "#/composition/container.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
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
} from "#/composition/tokens.js";
import { User } from "#/domain/entities/user.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { generateOutboxId } from "#/infrastructure/databases/outbox/utils.js";
import { ConflictError, NotFoundError } from "#/shared/errors/domain-error.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { EmailQueueOrderConfirmedHandlerService } from "./email-queue-order-confirmed-handler.service.js";
import { EmailQueueOrderConfirmedHandlerCommand } from "#/application/commands/email-queue-handlers/email-queue-order-confirmed-handler.command.js";
import { UserId } from "#/domain/value-objects/user-id.js";

describe("EmailQueueOrderConfirmedHandlerService", () => {
  let container: Container;
  let service: EmailQueueOrderConfirmedHandlerService;
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

    service = new EmailQueueOrderConfirmedHandlerService(
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

      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new EmailQueueOrderConfirmedHandlerCommand(
        DomainEventCode.ORDER_CONFIRMED,
        new Date(),
        order.id.value,
        user.id.value,
        order.getOrderItems().length,
        order.getTotalOrderPrice().amount,
        order.getTotalOrderPrice().currency,
        order.getSelectedShippingProvider(),
      );

      const jobId = generateOutboxId();

      // Act
      await service.execute(command, jobId);

      // Assert
      expect(emailGatewayMock.sendEmail).toHaveBeenCalledTimes(1);
      expect(emailGatewayMock.sendEmail).toHaveBeenCalledWith(
        user.email,
        "Order Confirmed",
        expect.any(String),
      );

      const key = await findIdempotencyKeyInDB(container, jobId); // adjust to your repo API
      expect(key).not.toBeNull();
      expect(key!.handlerName).toBe("EmailQueueOrderConfirmedHandlerService");
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

      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new EmailQueueOrderConfirmedHandlerCommand(
        DomainEventCode.ORDER_CONFIRMED,
        new Date(),
        order.id.value,
        user.id.value,
        order.getOrderItems().length,
        order.getTotalOrderPrice().amount,
        order.getTotalOrderPrice().currency,
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.confirm();

      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new EmailQueueOrderConfirmedHandlerCommand(
        DomainEventCode.ORDER_CONFIRMED,
        new Date(),
        order.id.value,
        UserId.generate().value, // non existent user
        order.getOrderItems().length,
        order.getTotalOrderPrice().amount,
        order.getTotalOrderPrice().currency,
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.confirm();

      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new EmailQueueOrderConfirmedHandlerCommand(
        DomainEventCode.ORDER_CONFIRMED,
        new Date(),
        OrderId.generate().value, // non existent order
        user.id.value,
        order.getOrderItems().length,
        order.getTotalOrderPrice().amount,
        order.getTotalOrderPrice().currency,
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

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const orderFromDB = await orderRepo.find(order.id);

      orderFromDB!.confirm();
      await setupOrderInDB(container, { owner: user, order: orderFromDB! });

      const command = new EmailQueueOrderConfirmedHandlerCommand(
        DomainEventCode.ORDER_CONFIRMED,
        new Date(),
        order.id.value,
        user.id.value,
        order.getOrderItems().length,
        order.getTotalOrderPrice().amount,
        order.getTotalOrderPrice().currency,
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
