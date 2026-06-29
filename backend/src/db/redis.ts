//
// redis.ts
//
// Shared ioredis connection. Used both by BullMQ (which needs its own options)
// and by the refresh-token store. BullMQ requires `maxRetriesPerRequest: null`,
// so we expose a factory that produces queue-suitable connections plus one
// general-purpose client for app data.
//

import { Redis, type RedisOptions } from "ioredis";
import { env } from "../config/env.js";

/**
 * Connection options handed to BullMQ. We pass plain options (URL + the flags
 * BullMQ requires) rather than a constructed Redis instance so BullMQ builds
 * its own client with its bundled ioredis — avoiding cross-package type/instance
 * mismatches between our ioredis and BullMQ's.
 */
export const bullConnectionOptions = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
} as const;

/** Make a fresh app-data connection (refresh tokens, OAuth state, etc.). */
export function makeRedis(options: RedisOptions = {}): Redis {
  return new Redis(env.REDIS_URL, options);
}

/** General-purpose client for app data. */
export const redis = makeRedis();
