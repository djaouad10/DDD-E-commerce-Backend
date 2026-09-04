import { Queue, QueueEvents } from "bullmq";
import type { Container } from "#/composition/container.js";
import { User } from "#/domain/entities/user.js";
import { Category } from "#/domain/entities/category.js";
import { Rating } from "#/domain/entities/rating.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import {
  REDIS,
  EMAIL_GATEWAY,
  ORDER_REPOSITORY,
} from "#/composition/tokens.js";
import {
  clearDatabase,
  createUserInDB,
  setupOrderInDB,
  createCategoryInDB,
  createProductInDB,
  createRatingInDB,
} from "#/tests/helpers/db-helpers.js";
import { productFactory } from "#/tests/helpers/domain-helpers.js";
import { createTestApp } from "#/tests/helpers/test-app.js";
import type { Redis } from "ioredis";
import { EmailQueueHandlerWorker } from "#/infrastructure/messaging/bullmq/workers/email-queue-handler.worker.js";
import type { Mock } from "vitest";
import { OrderCancelled } from "#/domain/events/order/order-cancelled.js";
import { generateOutboxId } from "#/infrastructure/databases/outbox/utils.js";
import { createBullMqEmailQueue } from "#/infrastructure/messaging/bullmq/queue/email.queue.js";
import { OrderCreated } from "#/domain/events/order/order-created.js";
import { OrderConfirmed } from "#/domain/events/order/order-confirmed.js";
import { OrderDelivered } from "#/domain/events/order/order-delivered.js";
import { OrderReturned } from "#/domain/events/order/order-returned.js";
import { RatingApproved } from "#/domain/events/rating/rating-approved.js";
import { RatingRejected } from "#/domain/events/rating/rating-rejected.js";
import { RatingSubmitted } from "#/domain/events/rating/rating-submitted.js";
import { UserRegistered } from "#/domain/events/user/user-registered.js";

describe("EmailQueueHandlerWorker Integration", () => {
  let container: Container;
  let redis: Redis;
  let queue: Queue;
  let queueEvents: QueueEvents;
  let worker: EmailQueueHandlerWorker;
  let emailGatewayMock: { sendEmail: Mock };

  beforeAll(async () => {
    const testApp = createTestApp();
    container = testApp.container;
    redis = container.resolveSingleton(REDIS);

    // Override gateway in the container so the worker uses the mock
    emailGatewayMock = { sendEmail: vitest.fn().mockResolvedValue(undefined) };
    container.register(EMAIL_GATEWAY, () => emailGatewayMock, "singleton");

    // Pass test container into worker
    worker = new EmailQueueHandlerWorker(redis, () => container);
    worker.start();

    queue = createBullMqEmailQueue(redis);

    queueEvents = new QueueEvents("email-queue", { connection: redis });
  });

  afterAll(async () => {
    await worker.stop();
    await queueEvents.close();
    await queue.close();
  });

  beforeEach(async () => {
    await clearDatabase(container);
    emailGatewayMock.sendEmail.mockClear();

    // Obliterate queue state between tests
    await queue.obliterate({ force: true });
  });

  test("should process ORDER_CREATED job end-to-end", async () => {
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

    const event = new OrderCreated(
      order.id.value,
      user.id.value,
      order.getOrderItems().length,
      order.getTotalOrderPrice().amount,
      order.getTotalOrderPrice().currency,
      order.getSelectedShippingProvider(),
    );

    const job = await queue.add(DomainEventCode.ORDER_CREATED, event, {
      jobId: generateOutboxId(),
    });

    await job.waitUntilFinished(queueEvents);

    expect(emailGatewayMock.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailGatewayMock.sendEmail).toHaveBeenCalledWith(
      user.email,
      "Order Created",
      expect.any(String),
    );
  });

  test("should process ORDER_CONFIRMED job end-to-end", async () => {
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

    const event = new OrderConfirmed(
      orderFromDB!.id.value,
      user.id.value,
      orderFromDB!.getOrderItems().length,
      orderFromDB!.getTotalOrderPrice().amount,
      orderFromDB!.getTotalOrderPrice().currency,
      orderFromDB!.getSelectedShippingProvider(),
    );

    const job = await queue.add(DomainEventCode.ORDER_CONFIRMED, event, {
      jobId: generateOutboxId(),
    });

    await job.waitUntilFinished(queueEvents);

    expect(emailGatewayMock.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailGatewayMock.sendEmail).toHaveBeenCalledWith(
      user.email,
      "Order Confirmed",
      expect.any(String),
    );
  });

  test("should process ORDER_CANCELLED job end-to-end", async () => {
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

    const event = new OrderCancelled(order.id.value, user.id.value);

    const job = await queue.add(DomainEventCode.ORDER_CANCELLED, event, {
      jobId: generateOutboxId(),
    });

    await job.waitUntilFinished(queueEvents);

    expect(emailGatewayMock.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailGatewayMock.sendEmail).toHaveBeenCalledWith(
      user.email,
      "Order Cancelled",
      expect.any(String),
    );
  });

  test("should process ORDER_DELIVERED job end-to-end", async () => {
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

    const event = new OrderDelivered(
      orderFromDB!.id.value,
      user.id.value,
      new Date(),
      orderFromDB!.getSelectedShippingProvider(),
    );

    const job = await queue.add(DomainEventCode.ORDER_DELIVERED, event, {
      jobId: generateOutboxId(),
    });

    await job.waitUntilFinished(queueEvents);

    expect(emailGatewayMock.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailGatewayMock.sendEmail).toHaveBeenCalledWith(
      user.email,
      "Order Delivered",
      expect.any(String),
    );
  });

  test("should process ORDER_RETURNED job end-to-end", async () => {
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

    const event = new OrderReturned(
      order.id.value,
      user.id.value,
      "Defective item",
      order.getSelectedShippingProvider(),
    );

    const job = await queue.add(DomainEventCode.ORDER_RETURNED, event, {
      jobId: generateOutboxId(),
    });

    await job.waitUntilFinished(queueEvents);

    expect(emailGatewayMock.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailGatewayMock.sendEmail).toHaveBeenCalledWith(
      user.email,
      "Order Returned",
      expect.any(String),
    );
  });

  test("should process RATING_APPROVED job end-to-end", async () => {
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

    const rating = Rating.create(user.id, product.id, 4, "Great product");
    await createRatingInDB(container, rating);

    const event = new RatingApproved(
      `${user.id.value}_${product.id.value}`,
      user.id.value,
      product.id.value,
      4,
    );

    const job = await queue.add(DomainEventCode.RATING_APPROVED, event, {
      jobId: generateOutboxId(),
    });

    await job.waitUntilFinished(queueEvents);

    expect(emailGatewayMock.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailGatewayMock.sendEmail).toHaveBeenCalledWith(
      user.email,
      "Rating Approved",
      expect.any(String),
    );
  });

  test("should process RATING_REJECTED job end-to-end", async () => {
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

    const rating = Rating.create(user.id, product.id, 1, "Spam");
    await createRatingInDB(container, rating);

    const event = new RatingRejected(
      `${user.id.value}_${product.id.value}`,
      user.id.value,
      product.id.value,
    );

    const job = await queue.add(DomainEventCode.RATING_REJECTED, event, {
      jobId: generateOutboxId(),
    });

    await job.waitUntilFinished(queueEvents);

    expect(emailGatewayMock.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailGatewayMock.sendEmail).toHaveBeenCalledWith(
      user.email,
      "Rating Rejected",
      expect.any(String),
    );
  });

  test("should process RATING_SUBMITTED job end-to-end", async () => {
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

    const rating = Rating.create(submitter.id, product.id, 4, "Nice product");
    await createRatingInDB(container, rating);

    const event = new RatingSubmitted(
      `${submitter.id.value}_${product.id.value}`,
      submitter.id.value,
      product.id.value,
      4,
      "Nice product",
    );

    const job = await queue.add(DomainEventCode.RATING_SUBMITTED, event, {
      jobId: generateOutboxId(),
    });

    await job.waitUntilFinished(queueEvents);

    expect(emailGatewayMock.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailGatewayMock.sendEmail).toHaveBeenCalledWith(
      admin.email,
      "Rating Submitted",
      expect.any(String),
    );
  });

  test("should process USER_REGISTERED job end-to-end", async () => {
    const user = User.create(
      "John",
      "john@example.com",
      "CLIENT",
      null,
      true,
      false,
    );
    await createUserInDB(container, user);

    const event = new UserRegistered(
      user.id.value,
      user.email,
      user.getName(),
      user.role,
    );

    const job = await queue.add(DomainEventCode.USER_REGISTERED, event, {
      jobId: generateOutboxId(),
    });

    await job.waitUntilFinished(queueEvents);

    expect(emailGatewayMock.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailGatewayMock.sendEmail).toHaveBeenCalledWith(
      user.email,
      "Welcome to Shop",
      expect.any(String),
    );
  });

  test("should fail job when payload is invalid", async () => {
    const job = await queue.add(
      DomainEventCode.ORDER_CANCELLED,
      { invalid: "payload" },
      { jobId: `test-invalid-${Date.now()}` },
    );

    await expect(job.waitUntilFinished(queueEvents)).rejects.toThrow();
  });
});
