import { Queue, QueueEvents } from "bullmq";
import type { Container } from "#/composition/utils/container.js";
import { Rating } from "#/domain/entities/rating.js";
import { DomainEventCode } from "#/domain/events/domain-event.js";
import { REDIS, EMAIL_GATEWAY } from "#/composition/utils/tokens.js";
import {
  clearDatabase,
  createUserInDB,
  createRatingInDB,
} from "#/tests/helpers/db-helpers.js";
import { userFactory } from "#/tests/helpers/domain-helpers.js";
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
import {
  progressOrderTo,
  setupOrderWithReservedStock,
} from "#/tests/helpers/order-helpers.js";
import { setupProductAndUserInDB } from "#/tests/helpers/cart-helpers.js";

describe("EmailQueueHandlerWorker Integration", () => {
  let container: Container;
  let redis: Redis;
  let queue: Queue;
  let queueEvents: QueueEvents;
  let worker: EmailQueueHandlerWorker;
  let emailGatewayMock: { sendEmail: Mock };

  beforeAll(async () => {
    const testApp = await createTestApp();
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
    const { order, user } = await setupOrderWithReservedStock(container, 2);

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
    const { order, user } = await setupOrderWithReservedStock(container, 2);

    const confirmedOrder = await progressOrderTo(
      container,
      order.id,
      "CONFIRMED",
    );

    const event = new OrderConfirmed(
      confirmedOrder!.id.value,
      user.id.value,
      confirmedOrder!.getOrderItems().length,
      confirmedOrder!.getTotalOrderPrice().amount,
      confirmedOrder!.getTotalOrderPrice().currency,
      confirmedOrder!.getSelectedShippingProvider(),
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
    const { order, user } = await setupOrderWithReservedStock(container, 2);

    const cancelledOrder = await progressOrderTo(
      container,
      order.id,
      "CANCELLED",
    );

    const event = new OrderCancelled(cancelledOrder.id.value, user.id.value);

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
    const { order, user } = await setupOrderWithReservedStock(container, 2);

    const deliveredOrder = await progressOrderTo(
      container,
      order.id,
      "DELIVERED",
    );

    const event = new OrderDelivered(
      deliveredOrder!.id.value,
      user.id.value,
      new Date(),
      deliveredOrder!.getSelectedShippingProvider(),
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
    const { order, user } = await setupOrderWithReservedStock(container, 2);

    const returnedOrder = await progressOrderTo(
      container,
      order.id,
      "RETURNED",
    );

    const event = new OrderReturned(
      returnedOrder.id.value,
      user.id.value,
      "Defective item",
      returnedOrder.getSelectedShippingProvider(),
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
    const { user, product } = await setupProductAndUserInDB(container);

    const rating = Rating.create(user.id, product.id, 4, "Nice product");
    rating.approve();

    await createRatingInDB(container, rating);

    const event = new RatingApproved(
      `${rating.userId.value}_${rating.productId.value}`,
      rating.userId.value,
      rating.productId.value,
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
    const { user, product } = await setupProductAndUserInDB(container);

    const rating = Rating.create(user.id, product.id, 4, "Nice product");
    rating.reject();

    await createRatingInDB(container, rating);

    const event = new RatingRejected(
      `${rating.userId.value}_${rating.productId.value}`,
      rating.userId.value,
      rating.productId.value,
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
    const admin = userFactory({ role: "ADMIN" });
    await createUserInDB(container, admin);

    const { user: submitter, product } =
      await setupProductAndUserInDB(container);

    const rating = Rating.create(submitter.id, product.id, 4, "Nice product");
    rating.approve();

    await createRatingInDB(container, rating);

    const event = new RatingSubmitted(
      `${rating.userId.value}_${rating.productId.value}`,
      rating.userId.value,
      rating.productId.value,
      rating.getRating(),
      rating.getComment(),
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
    const user = userFactory();
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
