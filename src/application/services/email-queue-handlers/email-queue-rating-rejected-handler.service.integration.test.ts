import type { Container } from "#/composition/utils/container.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import { EmailQueueRatingRejectedHandlerService } from "./email-queue-rating-rejected-handler.service.js";
import {
  clearDatabase,
  createCategoryInDB,
  createProductInDB,
  createRatingInDB,
  createUserInDB,
  findIdempotencyKeyInDB,
} from "#/tests/helpers/db-helpers.js";
import { productFactory } from "#/tests/helpers/domain-helpers.js";
import type { Mock } from "vitest";
import {
  DB,
  IDEMPOTENCY_KEYS_REPOSITORY,
  PRODUCT_REPOSITORY,
  RATING_REPOSITORY,
  USER_REPOSITORY,
} from "#/composition/utils/tokens.js";
import { User } from "#/domain/entities/user.js";
import { Rating } from "#/domain/entities/rating.js";
import { Category } from "#/domain/entities/category.js";
import { EmailQueueRatingRejectedHandlerCommand } from "#/application/commands/email-queue-handlers/email-queue-rating-rejected-handler.command.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { generateOutboxId } from "#/infrastructure/databases/outbox/utils.js";
import { ConflictError, NotFoundError } from "#/shared/errors/domain-error.js";
import { UserId } from "#/domain/value-objects/user-id.js";
import { ProductId } from "#/domain/value-objects/product-id.js";

describe("EmailQueueRatingRejectedHandlerService", () => {
  let container: Container;
  let service: EmailQueueRatingRejectedHandlerService;
  let emailGatewayMock: { sendEmail: Mock };

  beforeAll(async () => {
    const testApp = createTestApp();
    container = testApp.container;

    const db = container.resolveSingleton(DB);
    const userRepo = container.resolveSingleton(USER_REPOSITORY);
    const productRepo = container.resolveSingleton(PRODUCT_REPOSITORY);
    const ratingRepo = container.resolveSingleton(RATING_REPOSITORY);
    const idempotencyRepo = container.resolveSingleton(
      IDEMPOTENCY_KEYS_REPOSITORY,
    );

    // Mock external gateway, never send real emails in tests
    emailGatewayMock = { sendEmail: vitest.fn().mockResolvedValue(undefined) };

    service = new EmailQueueRatingRejectedHandlerService(
      db,
      emailGatewayMock as any,
      userRepo,
      productRepo,
      ratingRepo,
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
    test("when user, product and rating exist, it should send email and persist idempotency key", async () => {
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

      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const rating = Rating.create(user.id, product.id, 1, "Inappropriate");
      await createRatingInDB(container, rating);

      const command = new EmailQueueRatingRejectedHandlerCommand(
        DomainEventCode.RATING_REJECTED,
        new Date(),
        `${user.id.value}_${product.id.value}`,
        user.id.value,
        product.id.value,
      );

      const jobId = generateOutboxId();

      // Act
      await service.execute(command, jobId);

      // Assert
      expect(emailGatewayMock.sendEmail).toHaveBeenCalledTimes(1);
      expect(emailGatewayMock.sendEmail).toHaveBeenCalledWith(
        user.email,
        "Rating Rejected",
        expect.any(String),
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
      expect(key!.handlerName).toBe("EmailQueueRatingRejectedHandlerService");
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

      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const rating = Rating.create(user.id, product.id, 2, "Spam");
      await createRatingInDB(container, rating);

      const command = new EmailQueueRatingRejectedHandlerCommand(
        DomainEventCode.RATING_REJECTED,
        new Date(),
        `${user.id.value}_${product.id.value}`,
        user.id.value,
        product.id.value,
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

      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const rating = Rating.create(user.id, product.id, 3, "Okay");
      await createRatingInDB(container, rating);

      const command = new EmailQueueRatingRejectedHandlerCommand(
        DomainEventCode.RATING_REJECTED,
        new Date(),
        `${user.id.value}_${product.id.value}`,
        UserId.generate().value, // non existent user
        product.id.value,
      );

      const jobId = generateOutboxId();

      await expect(service.execute(command, jobId)).rejects.toThrow(
        NotFoundError,
      );
      expect(emailGatewayMock.sendEmail).not.toHaveBeenCalled();
    });

    test("when product does not exist, it should throw NotFoundError", async () => {
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      const command = new EmailQueueRatingRejectedHandlerCommand(
        DomainEventCode.RATING_REJECTED,
        new Date(),
        `${user.id.value}_${ProductId.generate().value}`,
        user.id.value,
        ProductId.generate().value, // non existent product
      );

      const jobId = generateOutboxId();

      await expect(service.execute(command, jobId)).rejects.toThrow(
        NotFoundError,
      );
      expect(emailGatewayMock.sendEmail).not.toHaveBeenCalled();
    });

    test("when rating does not exist, it should throw NotFoundError", async () => {
      const user = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, user);

      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // No rating created

      const command = new EmailQueueRatingRejectedHandlerCommand(
        DomainEventCode.RATING_REJECTED,
        new Date(),
        `${user.id.value}_${product.id.value}`,
        user.id.value,
        product.id.value,
      );

      const jobId = generateOutboxId();

      await expect(service.execute(command, jobId)).rejects.toThrow(
        NotFoundError,
      );
      expect(emailGatewayMock.sendEmail).not.toHaveBeenCalled();
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

      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const rating = Rating.create(user.id, product.id, 1, "Fake review");
      await createRatingInDB(container, rating);

      const command = new EmailQueueRatingRejectedHandlerCommand(
        DomainEventCode.RATING_REJECTED,
        new Date(),
        `${user.id.value}_${product.id.value}`,
        user.id.value,
        product.id.value,
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
