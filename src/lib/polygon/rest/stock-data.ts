/**
 * Polygon REST — stock price / volume context
 */

import { polygonFetch } from "../client";
import type {
  PolygonAggregatesResponse,
  PolygonStockSnapshot,
  PolygonAggregate,
} from "@/types/polygon";

/**
 * Daily OHLCV bars for a stock.
 */
export async function getStockDailyAggregates(
  ticker: string,
  from: string, // YYYY-MM-DD
  to: string,
  adjusted = true,
): Promise<PolygonAggregate[]> {
  const res = await polygonFetch<PolygonAggregatesResponse>(
    `/v2/aggs/ticker/${ticker.toUpperCase()}/range/1/day/${from}/${to}`,
    { adjusted: String(adjusted), sort: "asc", limit: 365 },
  );
  return res.results ?? [];
}

/**
 * Intraday 1-minute bars.
 */
export async function getStockIntradayAggregates(
  ticker: string,
  date: string, // YYYY-MM-DD
): Promise<PolygonAggregate[]> {
  const res = await polygonFetch<PolygonAggregatesResponse>(
    `/v2/aggs/ticker/${ticker.toUpperCase()}/range/1/minute/${date}/${date}`,
    { adjusted: "true", sort: "asc", limit: 500 },
  );
  return res.results ?? [];
}

/**
 * Current snapshot (last trade, quote, day bar).
 */
export async function getStockSnapshot(
  ticker: string,
): Promise<PolygonStockSnapshot | null> {
  const res = await polygonFetch<{
    ticker: PolygonStockSnapshot;
    status: string;
  }>(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker.toUpperCase()}`);
  return res.ticker ?? null;
}

/**
 * Multi-ticker snapshots (batch of up to 250).
 */
export async function getStockSnapshots(
  tickers: string[],
): Promise<PolygonStockSnapshot[]> {
  if (tickers.length === 0) return [];
  const res = await polygonFetch<{
    tickers: PolygonStockSnapshot[];
    status: string;
  }>(
    `/v2/snapshot/locale/us/markets/stocks/tickers`,
    { tickers: tickers.map((t) => t.toUpperCase()).join(",") },
  );
  return res.tickers ?? [];
}

/**
 * 30-day average volume for a ticker (last 30 trading days).
 */
export async function getAvgVolume30d(ticker: string): Promise<number | null> {
  const to = new Date();
  const from = new Date(to.getTime() - 45 * 86_400_000); // fetch 45 days, use last 30 trading
  const bars = await getStockDailyAggregates(
    ticker,
    from.toISOString().slice(0, 10),
    to.toISOString().slice(0, 10),
  );
  if (bars.length === 0) return null;
  const last30 = bars.slice(-30);
  const sum = last30.reduce((a, b) => a + b.v, 0);
  return sum / last30.length;
}
