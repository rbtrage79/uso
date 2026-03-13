/**
 * Deterministic scoring label assignment.
 * Maps an EnrichedSignal's score breakdown + context → a single ScoreLabel.
 * Priority ladder: first matching rule wins.
 */

import type { EnrichedSignal } from "@/types/signals";
import type { ScoreLabel } from "@/types/features";

export function getLabelForSignal(signal: EnrichedSignal): ScoreLabel {
  const s = signal.scoreBreakdown;
  const ctx = signal.context;
  const enrich = ctx.enrichment;

  // 1. Smart Money? High Confidence
  //    High composite AND high confidence → strongest institutional signal
  if (signal.totalScore >= 80 && signal.confidence >= 0.75) {
    return "Smart Money? High Confidence";
  }

  // 2. Volatility Bid
  //    Straddle / strangle / neutral combo → bidding on a move either way
  if (
    signal.isCombo &&
    (signal.signalType === "combo_straddle" ||
      signal.signalType === "combo_spread" ||
      signal.direction === "neutral")
  ) {
    return "Volatility Bid";
  }

  // 3. Event Chase
  //    Elevated event proximity score → explicitly timed around a catalyst
  if ((s.eventProximity ?? 0) >= 65) {
    return "Event Chase";
  }

  // 4. Hedge Wave
  //    Bearish + large notional → institutional hedging pattern
  if (signal.direction === "bearish" && signal.totalPremium >= 500_000) {
    return "Hedge Wave";
  }

  // 5. Theme Synchronization
  //    Both themeSync and peerSync elevated → basket-level positioning
  if ((s.themeSync ?? 0) >= 60 && (s.peerSync ?? 0) >= 55) {
    return "Theme Synchronization";
  }

  // 6. Sector Rotation
  //    High peer sync alone → coordinated sector flow
  if ((s.peerSync ?? 0) >= 65) {
    return "Sector Rotation";
  }

  // 7. Factor Rotation
  //    Factor data present + moderate peer sync
  if (enrich?.primaryFactor && (s.peerSync ?? 0) >= 50) {
    return "Factor Rotation";
  }

  // 8. Quiet Accumulation
  //    High novelty, no known catalyst → dark / undiscovered flow
  if ((s.novelty ?? 0) >= 55 && !enrich?.hasKnownCatalyst) {
    return "Quiet Accumulation";
  }

  // 9. Breakout Speculation
  //    Vol/OI spike + directional aggression → speculative breakout bet
  if ((s.volOi ?? 0) >= 60 && (s.directionality ?? 0) >= 60) {
    return "Breakout Speculation";
  }

  // 10. Smart Money? Low Confidence
  //    Elevated score but low confidence — pattern unclear
  if (signal.totalScore >= 65 && signal.confidence < 0.55) {
    return "Smart Money? Low Confidence";
  }

  // Fallback
  return "Quiet Accumulation";
}

/**
 * Batch variant — avoids repeated lookup on large lists.
 */
export function getLabelsForSignals(
  signals: EnrichedSignal[]
): Map<string, ScoreLabel> {
  const map = new Map<string, ScoreLabel>();
  for (const s of signals) {
    map.set(s.id, getLabelForSignal(s));
  }
  return map;
}
