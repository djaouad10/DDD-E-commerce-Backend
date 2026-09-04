import { Queue, QueueEvents } from "bullmq";
import type { Container } from "#/composition/container.js";
import { User } from "#/domain/entities/user.js";
import { SHIPPING_PROVIDER_GATEWAY, REDIS } from "#/composition/tokens.js";
import {
  clearDatabase,
  createUserInDB,
  setupOrderInDB,
  saveOrderInDB,
  findIdempotencyKeyInDB,
} from "#/tests/helpers/db-helpers.js";
import { createTestApp } from "#/tests/helpers/test-app.js";
import type { Redis } from "ioredis";
import { OutboxHandlerWorker } from "#/infrastructure/messaging/bullmq/workers/outbox-handler.worker.js"; // adjust path
import type { Mock } from "vitest";
import { generateOutboxId } from "#/infrastructure/databases/outbox/utils.js";
import { OutboxAction } from "#/application/repositories/outbox.repository.js";
import { ShippingProvider } from "#/domain/entities/order.js";
import { ORDER_REPOSITORY } from "#/composition/tokens.js";
import { OrderId } from "#/domain/value-objects/order-id.js";
import { createBullMqOutboxQueue } from "#/infrastructure/messaging/bullmq/queue/outbox.queue.js";

describe("OutboxHandlerWorker Integration", () => {
  let container: Container;
  let redis: Redis;
  let queue: Queue;
  let queueEvents: QueueEvents;
  let worker: OutboxHandlerWorker;
  let shippingProviderGatewayMock: {
    createShipment: Mock;
    activateShipment: Mock;
    deleteUnshippedShipment: Mock;
    updateUnShippedShipment: Mock;
  };

  beforeAll(async () => {
    const testApp = createTestApp();
    container = testApp.container;
    redis = container.resolveSingleton(REDIS);

    shippingProviderGatewayMock = {
      createShipment: vitest.fn(),
      activateShipment: vitest.fn(),
      deleteUnshippedShipment: vitest.fn(),
      updateUnShippedShipment: vitest.fn(),
    };

    container.register(
      SHIPPING_PROVIDER_GATEWAY,
      () => shippingProviderGatewayMock as any,
      "singleton",
    );

    worker = new OutboxHandlerWorker(redis, () => container);
    worker.start();

    queue = createBullMqOutboxQueue(redis);
    queueEvents = new QueueEvents("outbox-queue", { connection: redis });
  });

  afterAll(async () => {
    await worker.stop();
    await queueEvents.close();
    await queue.close();
  });

  beforeEach(async () => {
    await clearDatabase(container);

    shippingProviderGatewayMock.createShipment.mockReset();
    shippingProviderGatewayMock.activateShipment.mockReset();
    shippingProviderGatewayMock.deleteUnshippedShipment.mockReset();
    shippingProviderGatewayMock.updateUnShippedShipment.mockReset();

    await queue.obliterate({ force: true });
  });

  async function createConfirmedOrder() {
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

    // since the previous line updates the order version when saving, we have to re-read a fresh version so next update will not give a version conflict
    const latestOrderFromDB = await orderRepo.find(order.id);

    return { user, order: latestOrderFromDB! };
  }

  describe("CREATE_ORDER_IN_SHIPPING_API", () => {
    test("should process the job end-to-end, persisting the tracking number and idempotency key", async () => {
      const { order } = await createConfirmedOrder();

      shippingProviderGatewayMock.createShipment.mockResolvedValue({
        trackingNumber: "TRACK-999",
      });

      const jobId = generateOutboxId();
      const job = await queue.add(
        OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
        { orderId: order.id.value },
        { jobId },
      );

      await job.waitUntilFinished(queueEvents);

      expect(shippingProviderGatewayMock.createShipment).toHaveBeenCalledTimes(
        1,
      );

      const orderRepo = container.resolveSingleton(ORDER_REPOSITORY);
      const persistedOrder = await orderRepo.find(order.id);
      expect(persistedOrder!.getTrackingNumber()).toBe("TRACK-999");

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
      expect(key!.handlerName).toBe("CreateOrderInShippingProviderService");
    });

    test("should fail the job when the order does not exist", async () => {
      const jobId = generateOutboxId();
      const job = await queue.add(
        OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
        { orderId: OrderId.generate().value },
        { jobId },
      );

      await expect(job.waitUntilFinished(queueEvents)).rejects.toThrow();

      expect(shippingProviderGatewayMock.createShipment).not.toHaveBeenCalled();
    });
  });

  describe("CREATE_SHIPMENT_IN_SHIPPING_API (activate shipment)", () => {
    test("should process the job end-to-end using the tracking number", async () => {
      const { order } = await createConfirmedOrder();
      order.setTrackingNumber("TRACK-ACTIVATE-1");
      await saveOrderInDB(container, order);

      shippingProviderGatewayMock.activateShipment.mockResolvedValue({
        success: true,
      });

      const jobId = generateOutboxId();
      const job = await queue.add(
        OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API,
        { trackingNumber: "TRACK-ACTIVATE-1" },
        { jobId },
      );

      await job.waitUntilFinished(queueEvents);

      expect(shippingProviderGatewayMock.activateShipment).toHaveBeenCalledWith(
        "TRACK-ACTIVATE-1",
      );

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
      expect(key!.handlerName).toBe(
        "ActivateShipmentInShippingProviderService",
      );
    });

    test("should fail the job when no order matches the tracking number", async () => {
      const jobId = generateOutboxId();
      const job = await queue.add(
        OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API,
        { trackingNumber: "TRACK-DOES-NOT-EXIST" },
        { jobId },
      );

      await expect(job.waitUntilFinished(queueEvents)).rejects.toThrow();

      expect(
        shippingProviderGatewayMock.activateShipment,
      ).not.toHaveBeenCalled();
    });

    test("should fail the job when the gateway returns success: false", async () => {
      const { order } = await createConfirmedOrder();
      order.setTrackingNumber("TRACK-ACTIVATE-FAIL");
      await saveOrderInDB(container, order);

      shippingProviderGatewayMock.activateShipment.mockResolvedValue({
        success: false,
      });

      const jobId = generateOutboxId();
      const job = await queue.add(
        OutboxAction.CREATE_SHIPMENT_IN_SHIPPING_API,
        { trackingNumber: "TRACK-ACTIVATE-FAIL" },
        { jobId },
      );

      await expect(job.waitUntilFinished(queueEvents)).rejects.toThrow();

      // the idempotency key insert happens inside the same tx that rolls back,
      // so a failed gateway call must NOT leave a committed key behind
      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).toBeNull();
    });
  });

  describe("UPDATE_ORDER_IN_SHIPPING_API", () => {
    test("should process the job end-to-end", async () => {
      const { order } = await createConfirmedOrder();

      shippingProviderGatewayMock.updateUnShippedShipment.mockResolvedValue({
        success: true,
      });

      const jobId = generateOutboxId();
      const job = await queue.add(
        OutboxAction.UPDATE_ORDER_IN_SHIPPING_API,
        { orderId: order.id.value },
        { jobId },
      );

      await job.waitUntilFinished(queueEvents);

      expect(
        shippingProviderGatewayMock.updateUnShippedShipment,
      ).toHaveBeenCalledTimes(1);

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
      expect(key!.handlerName).toBe("UpdateOrderInShippingProviderService");
    });

    test("should fail the job when the gateway returns success: false", async () => {
      const { order } = await createConfirmedOrder();

      shippingProviderGatewayMock.updateUnShippedShipment.mockResolvedValue({
        success: false,
      });

      const jobId = generateOutboxId();
      const job = await queue.add(
        OutboxAction.UPDATE_ORDER_IN_SHIPPING_API,
        { orderId: order.id.value },
        { jobId },
      );

      await expect(job.waitUntilFinished(queueEvents)).rejects.toThrow();

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).toBeNull();
    });
  });

  describe("DELETE_ORDER_IN_SHIPPING_API", () => {
    test("should process the job end-to-end", async () => {
      shippingProviderGatewayMock.deleteUnshippedShipment.mockResolvedValue({
        success: true,
      });

      const jobId = generateOutboxId();
      const job = await queue.add(
        OutboxAction.DELETE_ORDER_IN_SHIPPING_API,
        {
          trackingNumber: "TRACK-DELETE-1",
          shippingProvider: ShippingProvider.WORLD_EXPRESS,
        },
        { jobId },
      );

      await job.waitUntilFinished(queueEvents);

      expect(
        shippingProviderGatewayMock.deleteUnshippedShipment,
      ).toHaveBeenCalledWith("TRACK-DELETE-1");

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).not.toBeNull();
      expect(key!.handlerName).toBe("DeleteOrderFromShippingProviderService");
    });

    test("should fail the job when the gateway returns success: false", async () => {
      shippingProviderGatewayMock.deleteUnshippedShipment.mockResolvedValue({
        success: false,
      });

      const jobId = generateOutboxId();
      const job = await queue.add(
        OutboxAction.DELETE_ORDER_IN_SHIPPING_API,
        {
          trackingNumber: "TRACK-DELETE-FAIL",
          shippingProvider: ShippingProvider.WORLD_EXPRESS,
        },
        { jobId },
      );

      await expect(job.waitUntilFinished(queueEvents)).rejects.toThrow();

      const key = await findIdempotencyKeyInDB(container, jobId);
      expect(key).toBeNull();
    });
  });

  describe("Validation & routing", () => {
    test("should fail the job when the payload does not match the schema for its action", async () => {
      const job = await queue.add(
        OutboxAction.CREATE_ORDER_IN_SHIPPING_API,
        { totallyWrongField: "oops" }, // missing required `orderId`
        { jobId: generateOutboxId() },
      );

      await expect(job.waitUntilFinished(queueEvents)).rejects.toThrow();

      expect(shippingProviderGatewayMock.createShipment).not.toHaveBeenCalled();
    });

    test("should fail the job when the job name is not a recognized outbox action", async () => {
      const job = await queue.add(
        "not_a_real_outbox_action",
        { orderId: "ord_whatever" },
        { jobId: `test-invalid-action-${Date.now()}` },
      );

      await expect(job.waitUntilFinished(queueEvents)).rejects.toThrow();
    });
  });
});
