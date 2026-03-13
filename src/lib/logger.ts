/**
 * Structured Logger
 *
 * Thin wrapper that emits JSON logs in production and coloured human-readable
 * logs in development. Integrates hooks for external error tracking (Sentry, etc).
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("signal.detected", { symbol: "NVDA", score: 91 });
 *   logger.warn("qc.suppressed", { reason: "tiny_lot", contracts: 5 });
 *   logger.error("api.polygon.failed", err, { endpoint: "/v3/trades" });
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  ts: string;         // ISO timestamp
  level: LogLevel;
  event: string;      // dot-namespaced event code (e.g. "signal.detected")
  data?: unknown;
  error?: { message: string; stack?: string; code?: string };
  traceId?: string;
}

// ─── Error tracking hooks ─────────────────────────────────────────────────────
// Set these in your app bootstrap (e.g., _app.tsx or instrumentation.ts)
// to pipe errors to Sentry, Datadog, etc.
type ErrorHook = (entry: LogEntry) => void;
const errorHooks: ErrorHook[] = [];

export function registerErrorHook(fn: ErrorHook): void {
  errorHooks.push(fn);
}

// ─── In-memory ring buffer (last 500 entries) for /api/health ────────────────
const MAX_RING = 500;
const ringBuffer: LogEntry[] = [];

export function getRecentLogs(level?: LogLevel, limit = 100): LogEntry[] {
  const filtered = level ? ringBuffer.filter((e) => e.level === level) : ringBuffer;
  return filtered.slice(-limit);
}

export function clearLogs(): void {
  ringBuffer.length = 0;
}

// ─── Core emit ────────────────────────────────────────────────────────────────

const IS_DEV = process.env.NODE_ENV !== "production";

function emit(level: LogLevel, event: string, data?: unknown, error?: unknown): void {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(data !== undefined ? { data } : {}),
    ...(error !== undefined ? {
      error: error instanceof Error
        ? { message: error.message, stack: error.stack, code: (error as NodeJS.ErrnoException).code }
        : { message: String(error) },
    } : {}),
  };

  // Ring buffer
  if (ringBuffer.length >= MAX_RING) ringBuffer.shift();
  ringBuffer.push(entry);

  // Console output
  if (IS_DEV) {
    const prefix = {
      debug: "\x1b[37m[DEBUG]\x1b[0m",
      info:  "\x1b[36m[INFO ]\x1b[0m",
      warn:  "\x1b[33m[WARN ]\x1b[0m",
      error: "\x1b[31m[ERROR]\x1b[0m",
    }[level];
    const msg = `${prefix} ${entry.ts.slice(11, 23)} ${event}`;
    if (data !== undefined) {
      (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(msg, data);
    } else {
      (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(msg);
    }
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  } else {
    // Production: JSON lines
    process.stdout.write(JSON.stringify(entry) + "\n");
  }

  // External hooks (Sentry, etc)
  if (level === "error" || level === "warn") {
    for (const hook of errorHooks) {
      try { hook(entry); } catch { /* never throw from logger */ }
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const logger = {
  debug: (event: string, data?: unknown) => emit("debug", event, data),
  info:  (event: string, data?: unknown) => emit("info",  event, data),
  warn:  (event: string, data?: unknown) => emit("warn",  event, data),
  error: (event: string, error?: unknown, data?: unknown) => emit("error", event, data, error),

  /** Time a block and log at info level */
  time: async <T>(event: string, fn: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    try {
      const result = await fn();
      emit("info", event, { durationMs: Date.now() - start });
      return result;
    } catch (err) {
      emit("error", event, { durationMs: Date.now() - start }, err);
      throw err;
    }
  },
};

// ─── Structured event codes (prevents typos) ─────────────────────────────────
export const LOG_EVENTS = {
  // Signal pipeline
  SIGNAL_DETECTED:          "signal.detected",
  SIGNAL_SUPPRESSED_QC:     "signal.suppressed.qc",
  SIGNAL_SUPPRESSED_DEDUP:  "signal.suppressed.dedup",
  SIGNAL_MERGED:            "signal.merged",
  SIGNAL_PUBLISHED:         "signal.published",
  SIGNAL_SCORE_COMPUTED:    "signal.score.computed",

  // API / network
  API_REQUEST:              "api.request",
  API_RESPONSE:             "api.response",
  API_RETRY:                "api.retry",
  API_RATE_LIMITED:         "api.rate_limited",
  API_FAILED:               "api.failed",
  API_CACHE_HIT:            "api.cache.hit",
  API_CACHE_MISS:           "api.cache.miss",

  // WebSocket
  WS_CONNECTED:             "ws.connected",
  WS_DISCONNECTED:          "ws.disconnected",
  WS_RECONNECTING:          "ws.reconnecting",
  WS_AUTH_FAILED:           "ws.auth.failed",
  WS_MESSAGE:               "ws.message",

  // Workers
  WORKER_JOB_START:         "worker.job.start",
  WORKER_JOB_DONE:          "worker.job.done",
  WORKER_JOB_FAILED:        "worker.job.failed",

  // Quality control
  QC_TINY_LOT:              "qc.tiny_lot",
  QC_DUPLICATE:             "qc.duplicate",
  QC_STALE:                 "qc.stale",
  QC_BROKEN_QUOTE:          "qc.broken_quote",
  QC_WEAK_DIRECTION:        "qc.weak_direction",
  QC_OFF_HOURS:             "qc.off_hours",

  // Health
  HEALTH_CHECK:             "health.check",
  HEALTH_DEGRADED:          "health.degraded",
} as const;
