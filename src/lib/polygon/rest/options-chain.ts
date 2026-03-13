/**
 * Polygon REST — options chain snapshot
 * GET /v3/snapshot/options/{underlyingAsset}
 * GET /v3/snapshot/options/{underlyingAsset}/{optionContract}
 */

import { polygonFetch, polygonPaginate } from "../client";
import type { PolygonOptionsChainResponse, PolygonOptionChainResult } from "@/types/polygon";

export interface ChainSnapshotParams {
  /** Filter by expiration date (YYYY-MM-DD) */
  expirationDate?: string;
  /** Filter by contract type */
  contractType?: "call" | "put";
  /** Strike price min */
  strikeMin?: number;
  /** Strike price max */
  strikeMax?: number;
  limit?: number;
}

/**
 * Full chain snapshot for an underlying — paginates all results.
 */
export async function getOptionsChain(
  underlying: string,
  params: ChainSnapshotParams = {},
): Promise<PolygonOptionChainResult[]> {
  const qp: Record<string, string | number | boolean | undefined> = {};
  if (params.expirationDate) qp["expiration_date"] = params.expirationDate;
  if (params.contractType) qp["contract_type"] = params.contractType;
  if (params.strikeMin !== undefined) qp["strike_price.gte"] = params.strikeMin;
  if (params.strikeMax !== undefined) qp["strike_price.lte"] = params.strikeMax;

  return polygonPaginate<PolygonOptionChainResult>(
    `/v3/snapshot/options/${underlying.toUpperCase()}`,
    qp,
    2000,
  );
}

/**
 * Snapshot for a specific option contract.
 */
export async function getOptionContractSnapshot(
  underlying: string,
  contractTicker: string,
): Promise<PolygonOptionChainResult | null> {
  const encoded = encodeURIComponent(contractTicker);
  const res = await polygonFetch<{ results: PolygonOptionChainResult; status: string }>(
    `/v3/snapshot/options/${underlying.toUpperCase()}/${encoded}`,
  );
  return res.results ?? null;
}

/**
 * Get near-term chain only (DTE ≤ 90 days, ±30% strike range from spot).
 */
export async function getNearTermChain(
  underlying: string,
  spotPrice: number,
  maxDte = 90,
): Promise<PolygonOptionChainResult[]> {
  const today = new Date();
  const maxExp = new Date(today.getTime() + maxDte * 86_400_000);
  const strikeMin = spotPrice * 0.7;
  const strikeMax = spotPrice * 1.3;

  const all = await getOptionsChain(underlying, {
    strikeMin,
    strikeMax,
  });

  // Filter DTE client-side
  return all.filter((c) => {
    const exp = new Date(c.details.expiration_date);
    return exp <= maxExp && exp >= today;
  });
}
