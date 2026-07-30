import { Queue } from "bullmq";
import { Redis } from "ioredis";

export function createOutboxQueue(connection: Redis) {
  return new Queue("outbox-queue", {
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
