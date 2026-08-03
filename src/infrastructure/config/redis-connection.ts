import { Redis, type RedisOptions } from "ioredis";

export const createRedisConnection = (options: RedisOptions): Redis => {
  return new Redis(options);
};
