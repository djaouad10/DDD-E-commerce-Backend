import { redisConnection } from "#/infrastructure/config/redis-connection.js";
import { Queue } from "bullmq";

export const outboxQueue = new Queue("outbox-queue", {
  connection: redisConnection,
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
