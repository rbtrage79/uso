/**
 * Signal Quality Control Layer
 *
 * Applied AFTER the flow-detector fires but BEFORE the signal is published.
 * Each check returns a suppression reason, or null if the signal passes.
 *
 * Ordered from cheapest to most expensive check.
 */

import { logger, LOG_EVENTS } from "@/lib/logger";
import { DETECTION_CONFIG } from "./config";
import type { DetectedSignalPayload } from "@/types/signals";
import { getMarketTimeContext } from "@/lib/market-hours";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SuppressionReason =
  | "tiny_lot"              // contracts below noise floor
  | "micro_premium"         // premium too small to be institutional
  | "broken_quote"          // bid > ask, negative IV, zero price
  | "stale_duplicate"       // same contract+direction within window
  | "zero_oi"               // no open interest (illiquid contract)
  | "weak_direction"        // direction confidence too low
  | "off_hours_low_score"   // low-score signal outside market hours
  | "negative_dte"          // expired contract
  | "implausible_iv"        // IV > 1000% or < 0 (data feed error)
  | "implausible_premium"   // premium/contract < $0.01 (penny option noise)
  | "passes";               // signal is good

export interface QCResult {
  passes: boolean;
  reason: SuppressionReason;
  penaltyScore: number;   // 0-30 points to subtract from totalScore
  notes: string[];
}

// ─── QC Configuration (all tunable) ──────────────────────────────────────────

export interface QCConfig {
  /** Minimum contracts to not be flagged as tiny lot */
  minContractsHard: number;          // default: 50 (absolute floor, below this → suppress)
  minContractsSoft: number;          // default: 100 (below this → penalty)
  /** Minimum premium (dollars) */
  minPremiumHard: number;            // default: 10_000 (suppress below)
  minPremiumSoft: number;            // default: 50_000 (penalty below)
  /** Minimum OI for contract to be considered liquid */
  minOpenInterest: number;           // default: 50
  /** Min premium per contract (below this = penny option noise) */
  minPremiumPerContract: number;     // default: 0.01 * 100 = $1 per contract = $1
  /** Max IV as decimal (10 = 1000%) — above this is a feed error */
  maxImpliedVol: number;             // default: 10.0
  /** Minimum direction confidence (0-1) to not penalize */
  minDirectionConfidence: number;    // default: 0.4
  /** Off-hours minimum score to publish (outside 9:30-16:00) */
  offHoursMinScore: number;          // default: 70
  /** Dedup window ms — already handled in flow-detector, but double-check here */
  dedupWindowMs: number;             // default: 5 * 60_000
}

const DEFAULT_QC_CONFIG: QCConfig = {
  minContractsHard:         50,
  minContractsSoft:         100,
  minPremiumHard:           10_000,
  minPremiumSoft:           50_000,
  minOpenInterest:          50,
  minPremiumPerContract:    1,           // $1 notional per contract
  maxImpliedVol:            10.0,
  minDirectionConfidence:   0.4,
  offHoursMinScore:         70,
  dedupWindowMs:            5 * 60_000,
};

// ─── Recent signal dedup store ────────────────────────────────────────────────

type DedupKey = string;
const recentSignals = new Map<DedupKey, number>(); // key → timestamp ms

function cleanupDedupStore(): void {
  const cutoff = Date.now() - 30 * 60_000; // keep 30 min
  for (const [key, ts] of recentSignals) {
    if (ts < cutoff) recentSignals.delete(key);
  }
}
setInterval(cleanupDedupStore, 5 * 60_000);

function dedupKey(p: DetectedSignalPayload): DedupKey {
  const leg = p.legs[0];
  return `${p.symbol}|${p.direction}|${leg?.strike ?? 0}|${leg?.expirationDate ?? ""}`;
}

// ─── QC statistics ────────────────────────────────────────────────────────────

interface QCStats {
  total: number;
  suppressed: number;
  byReason: Record<SuppressionReason, number>;
  penaltiesApplied: number;
}

const stats: QCStats = {
  total: 0,
  suppressed: 0,
  byReason: {} as Record<SuppressionReason, number>,
  penaltiesApplied: 0,
};

function recordSuppression(reason: SuppressionReason): void {
  stats.suppressed++;
  stats.byReason[reason] = (stats.byReason[reason] ?? 0) + 1;
}

export function getQCStats(): Readonly<QCStats> {
  return { ...stats, byReason: { ...stats.byReason } };
}

export function resetQCStats(): void {
  stats.total = 0;
  stats.suppressed = 0;
  stats.byReason = {} as Record<SuppressionReason, number>;
  stats.penaltiesApplied = 0;
}

// ─── Main QC function ─────────────────────────────────────────────────────────

export function runQualityControl(
  signal: DetectedSignalPayload,
  cfg: Partial<QCConfig> = {},
): QCResult {
  const c = { ...DEFAULT_QC_CONFIG, ...cfg };
  stats.total++;

  const notes: string[] = [];
  let penaltyScore = 0;

  // --- 1. Negative DTE (expired contract) ---
  const leg0 = signal.legs[0];
  if (leg0 && leg0.dte < 0) {
    logger.warn(LOG_EVENTS.QC_STALE, { symbol: signal.symbol, dte: leg0.dte });
    recordSuppression("negative_dte");
    return { passes: false, reason: "negative_dte", penaltyScore: 0, notes: ["Contract expired (DTE < 0)"] };
  }

  // --- 2. Tiny lot (hard floor) ---
  if (signal.totalContracts < c.minContractsHard) {
    logger.warn(LOG_EVENTS.QC_TINY_LOT, { symbol: signal.symbol, contracts: signal.totalContracts, threshold: c.minContractsHard });
    recordSuppression("tiny_lot");
    return { passes: false, reason: "tiny_lot", penaltyScore: 0, notes: [`Only ${signal.totalContracts} contracts (hard min: ${c.minContractsHard})`] };
  }

  // --- 3. Micro premium (hard floor) ---
  if (signal.totalPremium < c.minPremiumHard) {
    logger.warn(LOG_EVENTS.QC_TINY_LOT, { symbol: signal.symbol, premium: signal.totalPremium });
    recordSuppression("micro_premium");
    return { passes: false, reason: "micro_premium", penaltyScore: 0, notes: [`Premium $${signal.totalPremium.toFixed(0)} below hard min $${c.minPremiumHard}`] };
  }

  // --- 4. Broken quote checks ---
  for (const leg of signal.legs) {
    if (leg.impliedVol !== undefined) {
      if (leg.impliedVol < 0) {
        logger.warn(LOG_EVENTS.QC_BROKEN_QUOTE, { symbol: signal.symbol, iv: leg.impliedVol, issue: "negative_iv" });
        recordSuppression("broken_quote");
        return { passes: false, reason: "broken_quote", penaltyScore: 0, notes: ["Negative implied volatility (feed error)"] };
      }
      if (leg.impliedVol > c.maxImpliedVol) {
        logger.warn(LOG_EVENTS.QC_BROKEN_QUOTE, { symbol: signal.symbol, iv: leg.impliedVol, issue: "implausible_iv" });
        recordSuppression("implausible_iv");
        return { passes: false, reason: "implausible_iv", penaltyScore: 0, notes: [`IV ${(leg.impliedVol * 100).toFixed(0)}% is implausible (feed error)`] };
      }
    }

    // Premium per contract sanity check
    const premiumPerContract = leg.premium / Math.max(leg.quantity, 1);
    if (premiumPerContract < c.minPremiumPerContract) {
      logger.warn(LOG_EVENTS.QC_BROKEN_QUOTE, { symbol: signal.symbol, premiumPerContract, issue: "implausible_premium" });
      recordSuppression("implausible_premium");
      return { passes: false, reason: "implausible_premium", penaltyScore: 0, notes: [`Premium/contract $${premiumPerContract.toFixed(4)} is implausible`] };
    }

    // Zero OI on a non-new contract
    if (leg.openInterest !== undefined && leg.openInterest === 0 && leg.dte > 1) {
      notes.push(`Zero OI on ${leg.contractTicker} — illiquid contract`);
      penaltyScore += 10;
    }
  }

  // --- 5. Stale duplicate check ---
  const key = dedupKey(signal);
  const lastTs = recentSignals.get(key);
  const now = Date.now();
  const signalTs = now;

  if (lastTs !== undefined && (signalTs - lastTs) < c.dedupWindowMs) {
    logger.info(LOG_EVENTS.QC_DUPLICATE, { symbol: signal.symbol, key, ageMs: signalTs - lastTs });
    recordSuppression("stale_duplicate");
    return { passes: false, reason: "stale_duplicate", penaltyScore: 0, notes: ["Duplicate within dedup window"] };
  }
  recentSignals.set(key, signalTs);

  // --- 6. Soft checks (apply score penalties, but don't suppress) ---

  // Soft contracts threshold
  if (signal.totalContracts < c.minContractsSoft) {
    const penalty = Math.round((1 - signal.totalContracts / c.minContractsSoft) * 10);
    penaltyScore += penalty;
    notes.push(`Small lot (${signal.totalContracts} cts) — −${penalty}pts`);
  }

  // Soft premium threshold
  if (signal.totalPremium < c.minPremiumSoft) {
    const penalty = Math.round((1 - signal.totalPremium / c.minPremiumSoft) * 8);
    penaltyScore += penalty;
    notes.push(`Low premium ($${(signal.totalPremium / 1000).toFixed(0)}K) — −${penalty}pts`);
  }

  // --- 7. Weak direction inference penalty ---
  if (signal.confidence < c.minDirectionConfidence) {
    const penalty = Math.round((c.minDirectionConfidence - signal.confidence) / c.minDirectionConfidence * 15);
    penaltyScore += penalty;
    notes.push(`Low direction confidence (${(signal.confidence * 100).toFixed(0)}%) — −${penalty}pts`);
    logger.debug(LOG_EVENTS.QC_WEAK_DIRECTION, { symbol: signal.symbol, confidence: signal.confidence });
  }

  // --- 8. Off-hours low-score filter ---
  const marketCtx = getMarketTimeContext(new Date(signalTs));
  if (!marketCtx.isLive) {
    if (signal.totalScore < c.offHoursMinScore) {
      logger.info(LOG_EVENTS.QC_OFF_HOURS, {
        symbol: signal.symbol,
        score: signal.totalScore,
        session: marketCtx.session,
        minRequired: c.offHoursMinScore,
      });
      recordSuppression("off_hours_low_score");
      return { passes: false, reason: "off_hours_low_score", penaltyScore: 0, notes: [`Score ${signal.totalScore} below off-hours threshold ${c.offHoursMinScore} (session: ${marketCtx.session})`] };
    }
    // Penalty for off-hours (lower conviction)
    const sessionPenalty = marketCtx.session === "pre_market" ? 5 : marketCtx.session === "after_hours" ? 8 : 12;
    penaltyScore += sessionPenalty;
    notes.push(`Off-hours (${marketCtx.label}) — −${sessionPenalty}pts`);
  }

  if (penaltyScore > 0) stats.penaltiesApplied++;

  return {
    passes: true,
    reason: "passes",
    penaltyScore: Math.min(penaltyScore, 30), // cap total penalty
    notes,
  };
}

// ─── Batch QC for existing signal arrays ─────────────────────────────────────

export function filterSignalsByQC(
  signals: DetectedSignalPayload[],
  cfg: Partial<QCConfig> = {},
): { passed: DetectedSignalPayload[]; suppressed: Array<{ signal: DetectedSignalPayload; reason: SuppressionReason }> } {
  const passed: DetectedSignalPayload[] = [];
  const suppressed: Array<{ signal: DetectedSignalPayload; reason: SuppressionReason }> = [];

  for (const signal of signals) {
    const result = runQualityControl(signal, cfg);
    if (result.passes) {
      // Apply score penalty
      if (result.penaltyScore > 0) {
        passed.push({
          ...signal,
          totalScore: Math.max(0, signal.totalScore - result.penaltyScore),
        });
      } else {
        passed.push(signal);
      }
    } else {
      suppressed.push({ signal, reason: result.reason });
    }
  }

  return { passed, suppressed };
}
