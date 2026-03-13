/**
 * API Resilience Layer
 *
 * Provides:
 *  - Exponential-backoff retry with jitter
 *  - Rate-limit awareness (respects Retry-After header)
 *  - In-memory TTL cache (shared across module lifetime)
 *  - Request batching / deduplication for concurrent identical requests
 *  - Graceful degradation via stale-while-revalidate
 */

import { logger, LOG_EVENTS } from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RetryOptions {
  maxAttempts?: number;     // default 3
  baseDelayMs?: number;     // default 500
  maxDelayMs?: number;      // default 30_000
  retryOn?: (res: Response) => boolean;
}

export interface CacheOptions {
  ttlMs: number;            // time-to-live in ms
  staleMs?: number;         // serve stale for this long while revalidating (default: 2× ttl)
  key?: string;             // override auto-generated key
}

interface CacheEntry<T> {
  value: T;
  fetchedAt: number;
  ttlMs: number;
  staleMs: number;
}

// ─── In-memory cache ─────────────────────────────────────────────────────────

const cache = new Map<string, CacheEntry<unknown>>();
let cacheHits = 0;
let cacheMisses = 0;

/** Purge expired entries (run periodically to prevent memory leak) */
function purgeStaleCacheEntries(): void {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.fetchedAt + entry.staleMs) {
      cache.delete(key);
    }
  }
}

// Auto-purge every 5 minutes (server-side only)
if (typeof window === "undefined") {
  setInterval(purgeStaleCacheEntries, 5 * 60 * 1000);
}

export function getCacheStats() {
  return { size: cache.size, hits: cacheHits, misses: cacheMisses };
}

export function clearCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) cache.delete(key);
  }
}

// ─── In-flight deduplication ──────────────────────────────────────────────────
// Prevents thundering herd: concurrent callers with the same key share one fetch

const inFlight = new Map<string, Promise<unknown>>();

// ─── Rate-limit state ─────────────────────────────────────────────────────────

const rateLimitState = new Map<string, { blockedUntil: number; retryAfter: number }>();

function isRateLimited(host: string): boolean {
  const state = rateLimitState.get(host);
  if (!state) return false;
  return Date.now() < state.blockedUntil;
}

function recordRateLimit(host: string, retryAfterSec: number): void {
  const retryAfterMs = retryAfterSec * 1000;
  rateLimitState.set(host, {
    blockedUntil: Date.now() + retryAfterMs,
    retryAfter: retryAfterSec,
  });
  logger.warn(LOG_EVENTS.API_RATE_LIMITED, { host, retryAfterSec });
}

// ─── Core fetch with retry ────────────────────────────────────────────────────

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  opts: RetryOptions = {},
): Promise<Response> {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    maxDelayMs  = 30_000,
    retryOn     = (r) => r.status === 429 || r.status >= 500,
  } = opts;

  const host = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  // Check rate-limit block
  if (isRateLimited(host)) {
    const state = rateLimitState.get(host)!;
    const waitMs = state.blockedUntil - Date.now();
    logger.warn(LOG_EVENTS.API_RATE_LIMITED, { host, waitMs, action: "blocked" });
    await delay(waitMs);
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.debug(LOG_EVENTS.API_REQUEST, { url, attempt });
      const res = await fetch(url, init);

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60");
        recordRateLimit(host, retryAfter);
        if (attempt < maxAttempts) {
          await delay(Math.min(retryAfter * 1000, maxDelayMs));
          continue;
        }
      }

      if (retryOn(res) && attempt < maxAttempts) {
        const backoff = jitteredBackoff(attempt, baseDelayMs, maxDelayMs);
        logger.warn(LOG_EVENTS.API_RETRY, { url, attempt, status: res.status, backoffMs: backoff });
        await delay(backoff);
        continue;
      }

      logger.debug(LOG_EVENTS.API_RESPONSE, { url, status: res.status, attempt });
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const backoff = jitteredBackoff(attempt, baseDelayMs, maxDelayMs);
        logger.warn(LOG_EVENTS.API_RETRY, { url, attempt, error: String(err), backoffMs: backoff });
        await delay(backoff);
      }
    }
  }

  logger.error(LOG_EVENTS.API_FAILED, lastError, { url, maxAttempts });
  throw lastError ?? new Error(`Fetch failed after ${maxAttempts} attempts: ${url}`);
}

// ─── Cached + deduplicated fetch ─────────────────────────────────────────────

export async function fetchCached<T>(
  url: string,
  init: RequestInit | undefined,
  cacheOpts: CacheOptions,
  retryOpts?: RetryOptions,
): Promise<{ data: T; fromCache: boolean; stale: boolean }> {
  const cacheKey = cacheOpts.key ?? `${url}:${JSON.stringify(init?.body ?? "")}`;
  const ttlMs    = cacheOpts.ttlMs;
  const staleMs  = cacheOpts.staleMs ?? ttlMs * 2;
  const now      = Date.now();

  const existing = cache.get(cacheKey) as CacheEntry<T> | undefined;

  if (existing) {
    const age  = now - existing.fetchedAt;
    const fresh = age < existing.ttlMs;
    const stale = age < existing.staleMs;

    if (fresh) {
      cacheHits++;
      logger.debug(LOG_EVENTS.API_CACHE_HIT, { key: cacheKey, ageMs: age });
      return { data: existing.value, fromCache: true, stale: false };
    }

    if (stale) {
      cacheHits++;
      logger.debug(LOG_EVENTS.API_CACHE_HIT, { key: cacheKey, ageMs: age, stale: true });
      // Revalidate in background — don't await
      revalidateInBackground(url, init, cacheKey, ttlMs, staleMs, retryOpts);
      return { data: existing.value, fromCache: true, stale: true };
    }
  }

  cacheMisses++;

  // Deduplicate concurrent identical requests
  if (inFlight.has(cacheKey)) {
    const data = await inFlight.get(cacheKey) as T;
    return { data, fromCache: false, stale: false };
  }

  const fetchPromise = (async () => {
    const res  = await fetchWithRetry(url, init, retryOpts);
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    const data = await res.json() as T;
    cache.set(cacheKey, { value: data, fetchedAt: Date.now(), ttlMs, staleMs });
    logger.debug(LOG_EVENTS.API_CACHE_MISS, { key: cacheKey });
    return data;
  })();

  inFlight.set(cacheKey, fetchPromise);
  try {
    const data = await fetchPromise;
    return { data, fromCache: false, stale: false };
  } finally {
    inFlight.delete(cacheKey);
  }
}

// ─── Batching helper ──────────────────────────────────────────────────────────
// Groups individual requests into a single batch call

type BatchFn<TKey, TResult> = (keys: TKey[]) => Promise<Map<TKey, TResult>>;

export class Batcher<TKey, TResult> {
  private queue: Array<{ key: TKey; resolve: (v: TResult) => void; reject: (e: unknown) => void }> = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly batchFn: BatchFn<TKey, TResult>,
    private readonly maxWaitMs = 20,
    private readonly maxBatchSize = 50,
  ) {}

  load(key: TKey): Promise<TResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject });
      if (this.queue.length >= this.maxBatchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.maxWaitMs);
      }
    });
  }

  private flush(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const batch = this.queue.splice(0);
    if (!batch.length) return;

    const keys = batch.map((b) => b.key);
    this.batchFn(keys)
      .then((results) => {
        for (const item of batch) {
          const result = results.get(item.key);
          if (result !== undefined) {
            item.resolve(result);
          } else {
            item.reject(new Error(`Batch key not found: ${String(item.key)}`));
          }
        }
      })
      .catch((err) => {
        for (const item of batch) item.reject(err);
      });
  }
}

// ─── Graceful degradation wrapper ────────────────────────────────────────────

export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  context?: string,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.warn(LOG_EVENTS.API_FAILED, { context, error: String(err), usingFallback: true });
    return fallback;
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jitteredBackoff(attempt: number, base: number, max: number): number {
  const exp   = Math.min(base * Math.pow(2, attempt - 1), max);
  const jitter = Math.random() * 0.3 * exp; // ±30% jitter
  return Math.round(exp + jitter);
}

async function revalidateInBackground(
  url: string,
  init: RequestInit | undefined,
  cacheKey: string,
  ttlMs: number,
  staleMs: number,
  retryOpts?: RetryOptions,
): Promise<void> {
  try {
    const res  = await fetchWithRetry(url, init, retryOpts);
    if (res.ok) {
      const data = await res.json();
      cache.set(cacheKey, { value: data, fetchedAt: Date.now(), ttlMs, staleMs });
    }
  } catch { /* silent — we already returned stale data */ }
}
