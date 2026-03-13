/**
 * Main scoring engine — combines all dimensions into a composite score.
 */

import { DETECTION_CONFIG } from "@/lib/detection/config";
import type { ScoringDimensions, ScoreResult } from "@/types/signals";
import type { Direction } from "@/types/signals";
import {
  scoreVolOi,
  scoreNotional,
  scoreTimeOfDay,
  scoreIvAbnormality,
  scoreOiVelocity,
  scoreEventProximity,
  scorePeerSync,
  scoreDirectionality,
  scoreCombo,
  scoreThemeSync,
  scoreNovelty,
  type VolOiInput,
  type IvAbnormalityInput,
  type OiVelocityInput,
  type EventProximityInput,
  type PeerSyncInput,
  type DirectionalityInput,
  type ComboInput,
  type ThemeSyncInput,
  type NoveltyInput,
  type TimeOfDayInput,
} from "./dimensions";
import { clamp } from "@/lib/utils/options-math";

export interface ScorerInput {
  // Core leg data
  optionType: "call" | "put";
  contracts: number;
  premium: number;
  dte: number;
  strike: number;
  underlyingPrice?: number;
  impliedVol?: number;
  delta?: number;

  // Volume / OI
  volOi?: VolOiInput;

  // Time of day
  timeOfDay?: TimeOfDayInput;

  // IV
  ivData?: IvAbnormalityInput;

  // OI velocity
  oiVelocity?: OiVelocityInput;

  // Events
  eventProximity?: EventProximityInput;

  // Peers
  peerSync?: PeerSyncInput;

  // Directionality
  directionality?: DirectionalityInput;

  // Combo
  combo?: ComboInput;

  // Theme
  themeSync?: ThemeSyncInput;

  // Novelty
  novelty?: NoveltyInput;
}

const W = DETECTION_CONFIG.scoringWeights;

export function computeScore(input: ScorerInput): ScoreResult {
  const dimensions: ScoringDimensions = {
    volOi: input.volOi ? scoreVolOi(input.volOi) : defaultVolOiScore(input),
    notional: scoreNotional(input.premium),
    timeOfDay: input.timeOfDay ? scoreTimeOfDay(input.timeOfDay) : 50,
    ivAbnormality: input.ivData ? scoreIvAbnormality(input.ivData) : 0,
    oiVelocity: input.oiVelocity ? scoreOiVelocity(input.oiVelocity) : 0,
    eventProximity: input.eventProximity ? scoreEventProximity(input.eventProximity) : 0,
    peerSync: input.peerSync ? scorePeerSync(input.peerSync) : 0,
    directionality: input.directionality ? scoreDirectionality(input.directionality) : 50,
    combo: input.combo ? scoreCombo(input.combo) : 0,
    themeSync: input.themeSync ? scoreThemeSync(input.themeSync) : 0,
    novelty: input.novelty ? scoreNovelty(input.novelty) : 30,
  };

  const totalScore = computeWeightedScore(dimensions);
  const confidence = computeConfidence(dimensions, input);
  const direction = inferDirection(input);

  return { totalScore, confidence, dimensions, direction };
}

function defaultVolOiScore(input: ScorerInput): number {
  // Minimal estimate when no historical data available
  if (input.contracts >= 500) return 60;
  if (input.contracts >= 200) return 40;
  return 20;
}

function computeWeightedScore(dims: ScoringDimensions): number {
  const weighted =
    dims.volOi * W.volOi +
    dims.notional * W.notional +
    dims.timeOfDay * W.timeOfDay +
    dims.ivAbnormality * W.ivAbnormality +
    dims.oiVelocity * W.oiVelocity +
    dims.eventProximity * W.eventProximity +
    dims.peerSync * W.peerSync +
    dims.directionality * W.directionality +
    dims.combo * W.combo +
    dims.themeSync * W.themeSync +
    dims.novelty * W.novelty;

  return clamp(Math.round(weighted));
}

function computeConfidence(dims: ScoringDimensions, input: ScorerInput): number {
  // Confidence is high when multiple independent dimensions agree
  const highDims  = Object.values(dims).filter((v) => v >= 60).length;
  const totalDims = Object.values(dims).filter((v) => v > 0).length;
  if (totalDims === 0) return 0.3;

  // Base: fraction of active dimensions that score strongly
  let confidence = highDims / Math.max(totalDims, 1);

  // Additive boosts for strong primary signals (bounded before clamp)
  const boost =
    (dims.volOi         >= 70 ? 0.10 : 0) +
    (dims.notional      >= 70 ? 0.10 : 0) +
    (dims.eventProximity >= 60 ? 0.05 : 0) +
    (dims.directionality >= 65 ? 0.05 : 0);

  // Clamp the whole thing to [0, 1] — previously the boost could push above 1.0
  return clamp(confidence + boost, 0, 1);
}

function inferDirection(input: ScorerInput): Direction {
  const { optionType, directionality: di, combo } = input;

  // Multi-leg combos have structure-specific direction logic
  if (combo && combo.legCount >= 2) {
    const st = combo.identifiedStructure;
    if (st === "straddle" || st === "strangle") return "neutral";
    // Risk reversal: buying calls + selling puts = bullish; buying puts + selling calls = bearish
    if (st === "risk_reversal") {
      return optionType === "call" ? "bullish" : "bearish";
    }
    // Calendar / butterfly / condor are vol plays → neutral
    if (st === "calendar" || st === "butterfly" || st === "condor") return "neutral";
    // Call spreads
    if (st === "call_spread") return "bullish";
    if (st === "put_spread") return "bearish";
  }

  if (!di) {
    // No aggressor data — infer from contract type alone
    return optionType === "call" ? "bullish" : "bearish";
  }

  const aggressorBuy  = di.aggressorSide === "buy";
  const aggressorSell = di.aggressorSide === "sell";

  // Buying calls / selling puts = bullish intent
  if (optionType === "call" && aggressorBuy)  return "bullish";
  // Buying puts / selling calls = bearish intent
  if (optionType === "put"  && aggressorBuy)  return "bearish";
  // Selling calls (covered call / capping upside) → bearish lean
  if (optionType === "call" && aggressorSell) return "bearish";
  // Selling puts (cash-secured put / bullish income) → bullish lean
  if (optionType === "put"  && aggressorSell) return "bullish";

  // Unknown aggressor — fall back to contract type
  return optionType === "call" ? "bullish" : "bearish";
}
