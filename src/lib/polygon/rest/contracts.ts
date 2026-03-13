/**
 * Polygon REST — option contract reference data
 * GET /v3/reference/options/{options_ticker}
 */

import { polygonFetch, polygonPaginate } from "../client";
import type { PolygonOptionDetails } from "@/types/polygon";
import { parseOptionTicker } from "@/lib/utils/options-math";

interface PolygonOptionsRefResponse {
  results: PolygonOptionDetails;
  status: string;
  request_id: string;
}

interface PolygonOptionsListResponse {
  results: PolygonOptionDetails[];
  status: string;
  request_id: string;
  next_url?: string;
}

/**
 * Get reference details for one contract.
 */
export async function getOptionContractDetails(
  ticker: string,
): Promise<PolygonOptionDetails | null> {
  const encoded = encodeURIComponent(ticker);
  const res = await polygonFetch<PolygonOptionsRefResponse>(
    `/v3/reference/options/${encoded}`,
  );
  return res.results ?? null;
}

/**
 * List all active option contracts for an underlying.
 * Useful for building the DTE filter before subscribing to the WS feed.
 */
export async function listActiveContracts(
  underlying: string,
  params: {
    expirationDateGte?: string;
    expirationDateLte?: string;
    contractType?: "call" | "put";
    strikeMin?: number;
    strikeMax?: number;
  } = {},
): Promise<PolygonOptionDetails[]> {
  const qp: Record<string, string | number | boolean | undefined> = {
    underlying_ticker: underlying.toUpperCase(),
    expired: false,
  };
  if (params.expirationDateGte) qp["expiration_date.gte"] = params.expirationDateGte;
  if (params.expirationDateLte) qp["expiration_date.lte"] = params.expirationDateLte;
  if (params.contractType) qp["contract_type"] = params.contractType;
  if (params.strikeMin !== undefined) qp["strike_price.gte"] = params.strikeMin;
  if (params.strikeMax !== undefined) qp["strike_price.lte"] = params.strikeMax;

  return polygonPaginate<PolygonOptionDetails>(`/v3/reference/options`, qp, 5000);
}

/**
 * Get all tickers for an underlying with DTE ≤ maxDte.
 * Returns an array of option ticker strings, pre-filtered.
 */
export async function getActiveTickersUnder90Dte(
  underlying: string,
): Promise<string[]> {
  const today = new Date();
  const maxExp = new Date(today.getTime() + 90 * 86_400_000);
  const contracts = await listActiveContracts(underlying, {
    expirationDateGte: today.toISOString().slice(0, 10),
    expirationDateLte: maxExp.toISOString().slice(0, 10),
  });
  return contracts.map((c) => c.ticker);
}
