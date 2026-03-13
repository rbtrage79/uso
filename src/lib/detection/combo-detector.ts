/**
 * Combo Trade Detector
 *
 * Clusters related trades by underlying + time window to identify:
 * - Spreads (bull/bear verticals)
 * - Straddles / strangles
 * - Risk reversals
 * - Calendars
 * - Butterflies / iron structures
 * - Condors
 */

import { DETECTION_CONFIG as CFG } from "./config";
import type { RawTradeLeg, DetectedSignalPayload } from "@/types/signals";
import { computeScore } from "@/lib/scoring/scorer";
import type { ComboInput } from "@/lib/scoring/dimensions";

export interface ComboCandidate {
  underlying: string;
  legs: RawTradeLeg[];
  windowStart: number;
  windowEnd: number;
}

interface ComboStructure {
  type:
    | "spread"
    | "straddle"
    | "strangle"
    | "risk_reversal"
    | "calendar"
    | "butterfly"
    | "condor"
    | "unknown";
  direction: "bullish" | "bearish" | "neutral" | "mixed";
  confidence: number; // 0-1
  description: string;
}

// Pending legs grouped by underlying, waiting for more legs in the time window
const pendingLegs = new Map<string, RawTradeLeg[]>();

/**
 * Feed a single leg into the combo detector.
 * Returns a fully assembled combo signal if a structure is detected,
 * or null if the leg is buffered waiting for more.
 */
export function ingestLeg(
  leg: RawTradeLeg,
  now = Date.now(),
): DetectedSignalPayload | null {
  const key = leg.underlying;
  const existing = pendingLegs.get(key) ?? [];

  // Expire stale legs
  const fresh = existing.filter(
    (l) => now - l.tradeTime.getTime() <= CFG.comboWindowMs,
  );

  fresh.push(leg);
  pendingLegs.set(key, fresh);

  // Need at least 2 legs to analyze
  if (fresh.length < 2) return null;

  const structure = identifyStructure(fresh);
  if (structure.type === "unknown" && fresh.length < 3) return null;

  // Clear buffer after detection
  pendingLegs.delete(key);

  // Must meet minimum criteria
  const totalPremium = fresh.reduce((a, l) => a + l.premium, 0);
  const totalContracts = fresh.reduce((a, l) => a + l.quantity, 0);
  if (totalPremium < CFG.minPremium || totalContracts < CFG.minContracts) return null;

  const comboInput: ComboInput = {
    legCount: fresh.length,
    isLinkedByTime: true,
    isLinkedByExpiry: fresh.every((l) =>
      l.expirationDate.getTime() === fresh[0].expirationDate.getTime(),
    ),
    isLinkedByUnderlying: true,
    identifiedStructure:
      structure.type === "condor" ? "unknown" : structure.type,
  };

  const scoreResult = computeScore({
    optionType: fresh[0].optionType,
    contracts: totalContracts,
    premium: totalPremium,
    dte: fresh[0].dte,
    strike: fresh[0].strike,
    underlyingPrice: fresh[0].underlyingPrice ?? undefined,
    combo: comboInput,
  });

  return {
    symbol: leg.underlying,
    signalType: mapStructureToSignalType(structure.type),
    direction: structure.direction,
    totalScore: scoreResult.totalScore,
    confidence: scoreResult.confidence * structure.confidence,
    totalPremium,
    totalContracts,
    isCombo: true,
    scoreCombo: scoreResult.dimensions.combo,
    scoreDirectionality: scoreResult.dimensions.directionality,
    scoreNotional: scoreResult.dimensions.notional,
    legs: fresh,
  };
}

// ─── Structure identification ──────────────────────────────────────────────────

export function identifyStructure(legs: RawTradeLeg[]): ComboStructure {
  if (legs.length < 2) return unknown("Need at least 2 legs");

  const sorted = [...legs].sort((a, b) => a.strike - b.strike);
  const calls = sorted.filter((l) => l.optionType === "call");
  const puts = sorted.filter((l) => l.optionType === "put");
  const sameExpiry = legs.every(
    (l) => l.expirationDate.getTime() === legs[0].expirationDate.getTime(),
  );

  // ── Straddle: same strike, one call + one put, same expiry ─────────────────
  if (
    legs.length === 2 &&
    calls.length === 1 &&
    puts.length === 1 &&
    sameExpiry &&
    Math.abs(calls[0].strike - puts[0].strike) / calls[0].strike < 0.02
  ) {
    return {
      type: "straddle",
      direction: "neutral",
      confidence: 0.9,
      description: `Straddle at $${calls[0].strike} × ${legs[0].quantity} contracts`,
    };
  }

  // ── Strangle: different strikes, one call + one put, same expiry ───────────
  if (legs.length === 2 && calls.length === 1 && puts.length === 1 && sameExpiry) {
    const callStrike = calls[0].strike;
    const putStrike = puts[0].strike;
    if (callStrike > putStrike) {
      return {
        type: "strangle",
        direction: "neutral",
        confidence: 0.85,
        description: `Strangle: $${putStrike}P / $${callStrike}C`,
      };
    }
  }

  // ── Risk reversal: sell put + buy call (or vice versa), same expiry ────────
  if (
    legs.length === 2 &&
    calls.length === 1 &&
    puts.length === 1 &&
    sameExpiry
  ) {
    const callBought = calls[0].side === "buy";
    const putSold = puts[0].side === "sell";
    if (callBought && putSold) {
      return {
        type: "risk_reversal",
        direction: "bullish",
        confidence: 0.8,
        description: `Risk reversal: long $${calls[0].strike}C / short $${puts[0].strike}P`,
      };
    }
    const putBought = puts[0].side === "buy";
    const callSold = calls[0].side === "sell";
    if (putBought && callSold) {
      return {
        type: "risk_reversal",
        direction: "bearish",
        confidence: 0.8,
        description: `Risk reversal: long $${puts[0].strike}P / short $${calls[0].strike}C`,
      };
    }
  }

  // ── Call vertical / bull spread ────────────────────────────────────────────
  if (legs.length === 2 && calls.length === 2 && sameExpiry) {
    const lowerCall = calls.reduce((a, b) => (a.strike < b.strike ? a : b));
    const upperCall = calls.reduce((a, b) => (a.strike > b.strike ? a : b));
    const isLongSpread = lowerCall.side === "buy" && upperCall.side === "sell";
    if (isLongSpread) {
      return {
        type: "spread",
        direction: "bullish",
        confidence: 0.85,
        description: `Bull call spread: $${lowerCall.strike}/$${upperCall.strike}C`,
      };
    }
    const isShortSpread = lowerCall.side === "sell" && upperCall.side === "buy";
    if (isShortSpread) {
      return {
        type: "spread",
        direction: "bearish",
        confidence: 0.85,
        description: `Bear call spread: $${lowerCall.strike}/$${upperCall.strike}C`,
      };
    }
  }

  // ── Put vertical / bear spread ─────────────────────────────────────────────
  if (legs.length === 2 && puts.length === 2 && sameExpiry) {
    const lowerPut = puts.reduce((a, b) => (a.strike < b.strike ? a : b));
    const upperPut = puts.reduce((a, b) => (a.strike > b.strike ? a : b));
    const isBearSpread = upperPut.side === "buy" && lowerPut.side === "sell";
    if (isBearSpread) {
      return {
        type: "spread",
        direction: "bearish",
        confidence: 0.85,
        description: `Bear put spread: $${lowerPut.strike}/$${upperPut.strike}P`,
      };
    }
  }

  // ── Calendar spread: same strike, different expiries ──────────────────────
  if (legs.length === 2 && !sameExpiry) {
    const sameStrike = Math.abs(legs[0].strike - legs[1].strike) / legs[0].strike < 0.01;
    if (sameStrike) {
      return {
        type: "calendar",
        direction: "neutral",
        confidence: 0.75,
        description: `Calendar spread at $${legs[0].strike}`,
      };
    }
  }

  // ── Butterfly: 3 legs ─────────────────────────────────────────────────────
  if (legs.length === 3 && sameExpiry) {
    const strikes = sorted.map((l) => l.strike);
    const [low, mid, high] = strikes;
    const symmetric = Math.abs(mid - low - (high - mid)) / (high - low) < 0.1;
    if (symmetric) {
      return {
        type: "butterfly",
        direction: "neutral",
        confidence: 0.7,
        description: `Butterfly at $${low}/$${mid}/$${high}`,
      };
    }
  }

  // ── Condor: 4 legs ────────────────────────────────────────────────────────
  if (legs.length === 4 && sameExpiry && calls.length === 2 && puts.length === 2) {
    return {
      type: "condor",
      direction: "neutral",
      confidence: 0.65,
      description: `Iron condor structure`,
    };
  }

  return unknown(`${legs.length}-leg structure unclear`);
}

function unknown(reason: string): ComboStructure {
  return {
    type: "unknown",
    direction: "mixed",
    confidence: 0.3,
    description: reason,
  };
}

function mapStructureToSignalType(
  type: ComboStructure["type"],
): DetectedSignalPayload["signalType"] {
  const map: Record<string, DetectedSignalPayload["signalType"]> = {
    straddle: "combo_straddle",
    strangle: "combo_straddle",
    risk_reversal: "combo_risk_reversal",
    spread: "combo_spread",
    calendar: "combo_spread",
    butterfly: "combo_other",
    condor: "combo_other",
    unknown: "combo_other",
  };
  return map[type] ?? "combo_other";
}
