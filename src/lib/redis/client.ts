/**
 * Redis client — singleton with graceful degradation when Redis is unavailable.
 * Uses ioredis. Falls back to a no-op in mock/dev mode if Redis is unreachable.
 */

import Redis from "ioredis";

let client: Redis | null = null;

function createClient(): Redis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const redis = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
  });

  redis.on("error", (err) => {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[Redis] Connection error:", err.message);
    }
  });

  return redis;
}

export function getRedis(): Redis {
  if (!client) client = createClient();
  return client;
}

/** True when Redis is reachable */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const r = getRedis();
    await r.ping();
    return true;
  } catch {
    return false;
  }
}

export async function closeRedis() {
  if (client) {
    await client.quit();
    client = null;
  }
}
