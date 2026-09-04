import type { Container } from "#/composition/utils/container.js";
import { cleanupTestApp, createTestApp } from "#/tests/helpers/test-app.js";
import { EmailQueueRatingSubmittedHandlerService } from "./email-queue-rating-submitted-handler.service.js";
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
  USER_QUERIES,
} from "#/composition/utils/tokens.js";
import { User } from "#/domain/entities/user.js";
import { Rating } from "#/domain/entities/rating.js";
import { Category } from "#/domain/entities/category.js";
import { EmailQueueRatingSubmittedHandlerCommand } from "#/application/commands/email-queue-handlers/email-queue-rating-submitted-handler.command.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { generateOutboxId } from "#/infrastructure/databases/outbox/utils.js";
import { ConflictError, NotFoundError } from "#/shared/errors/domain-error.js";
import { ProductId } from "#/domain/value-objects/product-id.js";

describe("EmailQueueRatingSubmittedHandlerService", () => {
  let container: Container;
  let service: EmailQueueRatingSubmittedHandlerService;
  let emailGatewayMock: { sendEmail: Mock };

  beforeAll(async () => {
    const testApp = createTestApp();
    container = testApp.container;

    const db = container.resolveSingleton(DB);
    const userQueries = container.resolveSingleton(USER_QUERIES);
    const productRepo = container.resolveSingleton(PRODUCT_REPOSITORY);
    const ratingRepo = container.resolveSingleton(RATING_REPOSITORY);
    const idempotencyRepo = container.resolveSingleton(
      IDEMPOTENCY_KEYS_REPOSITORY,
    );

    // Mock external gateway, never send real emails in tests
    emailGatewayMock = { sendEmail: vitest.fn().mockResolvedValue(undefined) };

    service = new EmailQueueRatingSubmittedHandlerService(
      db,
      emailGatewayMock as any,
      userQueries,
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
    test("when admin, product and rating exist, it should send email to admin and persist idempotency key", async () => {
      // Arrange
      const admin = User.create(
        "Admin",
        "admin@example.com",
        "ADMIN",
        null,
        true,
        false,
      );
      await createUserInDB(container, admin);

      const submitter = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, submitter);

      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const rating = Rating.create(
        submitter.id,
        product.id,
        4,
        "Great product",
      );
      await createRatingInDB(container, rating);

      const command = new EmailQueueRatingSubmittedHandlerCommand(
        DomainEventCode.RATING_SUBMITTED,
        new Date(),
        `${submitter.id.value}_${product.id.value}`,
        submitter.id.value,
        product.id.value,
        4,
        "Great product",
      );

      const jobId = generateOutboxId();

      // Act
      await service.execute(command, jobId);

      // Assert
      expect(emailGatewayMock.sendEmail).toHaveBeenCalledTimes(1);
      expect(emailGatewayMock.sendEmail).toHaveBeenCalledWith(
        admin.email,
        "Rating Submitted",
        expect.any(String),
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
      expect(key!.handlerName).toBe("EmailQueueRatingSubmittedHandlerService");
    });
  });

  describe("Idempotency", () => {
    test("when executed twice with same jobId, second attempt should throw", async () => {
      const admin = User.create(
        "Admin",
        "admin@example.com",
        "ADMIN",
        null,
        true,
        false,
      );
      await createUserInDB(container, admin);

      const submitter = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, submitter);

      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const rating = Rating.create(submitter.id, product.id, 5, null);
      await createRatingInDB(container, rating);

      const command = new EmailQueueRatingSubmittedHandlerCommand(
        DomainEventCode.RATING_SUBMITTED,
        new Date(),
        `${submitter.id.value}_${product.id.value}`,
        submitter.id.value,
        product.id.value,
        5,
        null,
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
    test("when no admin exists, it should throw NotFoundError", async () => {
      // Arrange — no admin in DB
      const submitter = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, submitter);

      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const rating = Rating.create(submitter.id, product.id, 3, "Okay");
      await createRatingInDB(container, rating);

      const command = new EmailQueueRatingSubmittedHandlerCommand(
        DomainEventCode.RATING_SUBMITTED,
        new Date(),
        `${submitter.id.value}_${product.id.value}`,
        submitter.id.value,
        product.id.value,
        3,
        "Okay",
      );

      const jobId = generateOutboxId();

      // Act + Assert
      await expect(service.execute(command, jobId)).rejects.toThrow(
        NotFoundError,
      );
      expect(emailGatewayMock.sendEmail).not.toHaveBeenCalled();
    });

    test("when product does not exist, it should throw NotFoundError", async () => {
      const admin = User.create(
        "Admin",
        "admin@example.com",
        "ADMIN",
        null,
        true,
        false,
      );
      await createUserInDB(container, admin);

      const submitter = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, submitter);

      const command = new EmailQueueRatingSubmittedHandlerCommand(
        DomainEventCode.RATING_SUBMITTED,
        new Date(),
        `${submitter.id.value}_${ProductId.generate().value}`,
        submitter.id.value,
        ProductId.generate().value, // non existent product
        4,
        "Great product",
      );

      const jobId = generateOutboxId();

      await expect(service.execute(command, jobId)).rejects.toThrow(
        NotFoundError,
      );
      expect(emailGatewayMock.sendEmail).not.toHaveBeenCalled();
    });

    test("when rating does not exist, it should throw NotFoundError", async () => {
      const admin = User.create(
        "Admin",
        "admin@example.com",
        "ADMIN",
        null,
        true,
        false,
      );
      await createUserInDB(container, admin);

      const submitter = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, submitter);

      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      // No rating created

      const command = new EmailQueueRatingSubmittedHandlerCommand(
        DomainEventCode.RATING_SUBMITTED,
        new Date(),
        `${submitter.id.value}_${product.id.value}`,
        submitter.id.value,
        product.id.value,
        4,
        "Great product",
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
      const admin = User.create(
        "Admin",
        "admin@example.com",
        "ADMIN",
        null,
        true,
        false,
      );
      await createUserInDB(container, admin);

      const submitter = User.create(
        "John",
        "john@example.com",
        "CLIENT",
        null,
        true,
        false,
      );
      await createUserInDB(container, submitter);

      const category = Category.create("Category");
      const product = productFactory({ categoryId: category.id });
      await createCategoryInDB(container, category);
      await createProductInDB(container, product);

      const rating = Rating.create(submitter.id, product.id, 2, "Bad");
      await createRatingInDB(container, rating);

      const command = new EmailQueueRatingSubmittedHandlerCommand(
        DomainEventCode.RATING_SUBMITTED,
        new Date(),
        `${submitter.id.value}_${product.id.value}`,
        submitter.id.value,
        product.id.value,
        2,
        "Bad",
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
