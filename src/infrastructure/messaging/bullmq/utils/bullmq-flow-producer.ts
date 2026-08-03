import { FlowProducer } from "bullmq";
import type { Redis } from "ioredis";

export function createBullMqFlowProducer(connection: Redis) {
  return new FlowProducer({ connection });
}
