/**
 * Polygon REST — options trade history
 * GET /v3/trades/{optionsTicker}
 */

import { polygonPaginate, polygonFetch } from "../client";
import type { PolygonOptionTrade, PolygonCursor } from "@/types/polygon";

export interface OptionsTradeParams {
  /** ISO date string YYYY-MM-DD or exact timestamp */
  timestamp?: string;
  /** Timestamp LT / LTE / GT / GTE for range queries */
  timestampLt?: string;
  timestampGt?: string;
  order?: "asc" | "desc";
  limit?: number;
}

/**
 * Fetch recent trades for a single options contract.
 * ticker format: O:AAPL231215C00180000
 */
export async function getOptionTrades(
  ticker: string,
  params: OptionsTradeParams = {},
): Promise<PolygonOptionTrade[]> {
  const qp: Record<string, string | number | boolean | undefined> = {
    order: params.order ?? "desc",
    limit: params.limit ?? 100,
  };
  if (params.timestamp) qp["timestamp"] = params.timestamp;
  if (params.timestampLt) qp["timestamp.lt"] = params.timestampLt;
  if (params.timestampGt) qp["timestamp.gt"] = params.timestampGt;

  const encoded = encodeURIComponent(ticker);
  const res = await polygonFetch<PolygonCursor<PolygonOptionTrade>>(
    `/v3/trades/${encoded}`,
    qp,
  );
  return res.results ?? [];
}

/**
 * Paginate all trades for a contract within a date range.
 */
export async function getAllOptionTradesForDate(
  ticker: string,
  date: string, // YYYY-MM-DD
): Promise<PolygonOptionTrade[]> {
  const encoded = encodeURIComponent(ticker);
  return polygonPaginate<PolygonOptionTrade>(
    `/v3/trades/${encoded}`,
    {
      "timestamp.gte": `${date}T09:30:00.000000000Z`,
      "timestamp.lte": `${date}T16:00:00.000000000Z`,
      order: "asc",
    },
    10_000,
  );
}
