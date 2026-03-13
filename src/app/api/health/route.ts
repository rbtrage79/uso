/**
 * GET /api/health
 *
 * Returns system health status including:
 * - Mode (mock / live)
 * - Market session
 * - Recent error count
 * - Cache statistics
 * - Build info
 *
 * Used by monitoring systems, the signal-quality dashboard, and the topbar badge.
 */

import { NextResponse } from "next/server";
import { getMarketTimeContext } from "@/lib/market-hours";
import { getCacheStats } from "@/lib/api/resilience";
import { getRecentLogs } from "@/lib/logger";

export const dynamic  = "force-dynamic";
export const runtime  = "nodejs";

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  ts: string;
  uptime: number;                 // seconds
  mode: "mock" | "live";
  market: {
    session: string;
    etTime: string;
    isLive: boolean;
    isTradingDay: boolean;
    label: string;
  };
  errors: {
    last5min: number;
    last1h: number;
    recentMessages: Array<{ ts: string; event: string; message: string }>;
  };
  cache: {
    entries: number;
    hitRate: string;
  };
  services: {
    polygon: "up" | "degraded" | "down" | "mock";
    redis:   "up" | "degraded" | "down" | "mock";
    db:      "up" | "degraded" | "down" | "mock";
  };
  build: {
    version: string;
    env: string;
  };
}

const startTime = Date.now();

export async function GET() {
  const now = new Date();
  const market = getMarketTimeContext(now);
  const isMock = process.env.MOCK_MODE === "true" || process.env.NEXT_PUBLIC_MOCK_MODE === "true";

  // Gather recent errors from log ring buffer
  const recentErrors = getRecentLogs("error", 100);
  const fiveMinAgo   = Date.now() - 5 * 60_000;
  const oneHourAgo   = Date.now() - 60 * 60_000;
  const errors5m     = recentErrors.filter((e) => new Date(e.ts).getTime() > fiveMinAgo).length;
  const errors1h     = recentErrors.filter((e) => new Date(e.ts).getTime() > oneHourAgo).length;

  const cacheStats = getCacheStats();
  const hitRate = (cacheStats.hits + cacheStats.misses) > 0
    ? `${Math.round((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100)}%`
    : "N/A";

  // Determine service statuses
  const services: HealthResponse["services"] = {
    polygon: isMock ? "mock" : (process.env.POLYGON_API_KEY ? "up" : "down"),
    redis:   isMock ? "mock" : (process.env.REDIS_URL ? "up" : "down"),
    db:      isMock ? "mock" : (process.env.DATABASE_URL ? "up" : "down"),
  };

  const allDown = !isMock && Object.values(services).every((s) => s === "down");
  const anyDegraded = Object.values(services).some((s) => s === "degraded");

  const status: HealthResponse["status"] =
    allDown ? "unhealthy" : (anyDegraded || errors5m >= 10) ? "degraded" : "healthy";

  const health: HealthResponse = {
    status,
    ts: now.toISOString(),
    uptime: Math.round((Date.now() - startTime) / 1000),
    mode: isMock ? "mock" : "live",
    market: {
      session:     market.session,
      etTime:      market.etTime,
      isLive:      market.isLive,
      isTradingDay: market.isTradingDay,
      label:       market.label,
    },
    errors: {
      last5min: errors5m,
      last1h:   errors1h,
      recentMessages: recentErrors.slice(-5).map((e) => ({
        ts:      e.ts,
        event:   e.event,
        message: e.error?.message ?? String(e.data ?? ""),
      })),
    },
    cache: {
      entries: cacheStats.size,
      hitRate,
    },
    services,
    build: {
      version: process.env.npm_package_version ?? "unknown",
      env:     process.env.NODE_ENV ?? "unknown",
    },
  };

  return NextResponse.json(health, {
    status: status === "unhealthy" ? 503 : 200,
    headers: {
      "Cache-Control": "no-store, no-cache",
      "X-Health-Status": status,
    },
  });
}
