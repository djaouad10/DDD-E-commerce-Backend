import { Queue } from "bullmq";
import type { Redis } from "ioredis";

export function createBullMqInventoryQueue(connection: Redis) {
  return new Queue("inventory-queue", {
    connection: connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      priority: 0,
      removeOnComplete: true,
      removeOnFail: true,
    },
  });
}
