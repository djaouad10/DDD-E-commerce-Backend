import { Redis } from "ioredis";
import { env } from "./env.js";

// since each worker will run on a separate process, they will not share the same redis connection. so we can define only one connection here instead of one connection for the server and one for each worker.

// server uses connection to initilize queues, maybe use redis as a KV cache
// processor workers use connection publish jobs to queues
// handler workers use connection to subscribe to queues

export const redisConnection = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null, // required by bullmq
  enableReadyCheck: false, // required by bullmq
  lazyConnect: true, // connection is established on first use instead of on server startup (faster startup time)
});
