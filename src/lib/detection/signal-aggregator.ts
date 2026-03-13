/**
 * Signal Aggregator — deduplicates, merges, and publishes signals.
 * Sits between the flow/combo detectors and the DB/feed writer.
 */

import { DETECTION_CONFIG as CFG } from "./config";
import type { DetectedSignalPayload } from "@/types/signals";

export type SignalHandler = (signal: DetectedSignalPayload) => Promise<void> | void;

interface AggregatorState {
  handlers: SignalHandler[];
  recentSignals: Map<string, { payload: DetectedSignalPayload; ts: number }>;
  stats: {
    ingested: number;
    deduped: number;
    published: number;
    belowThreshold: number;
  };
}

const state: AggregatorState = {
  handlers: [],
  recentSignals: new Map(),
  stats: { ingested: 0, deduped: 0, published: 0, belowThreshold: 0 },
};

/** Register a downstream handler (DB writer, feed publisher, alert sender, etc.) */
export function registerHandler(fn: SignalHandler) {
  state.handlers.push(fn);
}

/**
 * Submit a candidate signal. The aggregator will:
 * 1. Filter below-threshold signals
 * 2. Deduplicate near-identical signals within the dedup window
 * 3. Merge (accumulate premium/contracts) for the same contract
 * 4. Dispatch to registered handlers
 */
export async function submitSignal(signal: DetectedSignalPayload): Promise<void> {
  state.stats.ingested++;

  // Gate: below minimum score
  if (signal.totalScore < CFG.minScoreToStore) {
    state.stats.belowThreshold++;
    return;
  }

  // Dedup key: symbol + signalType + direction + primary strike + expiry bucket
  const primaryLeg = signal.legs[0];
  const expiryBucket = primaryLeg
    ? Math.floor(primaryLeg.expirationDate.getTime() / 86_400_000)
    : 0;
  const strikeBucket = primaryLeg ? Math.round(primaryLeg.strike / 5) * 5 : 0;
  const dedupKey = `${signal.symbol}:${signal.signalType}:${signal.direction}:${strikeBucket}:${expiryBucket}`;

  const existing = state.recentSignals.get(dedupKey);
  const now = Date.now();

  if (existing && now - existing.ts < CFG.dedupWindowMs) {
    // Merge: update premium and contracts but don't re-publish
    existing.payload.totalPremium += signal.totalPremium;
    existing.payload.totalContracts += signal.totalContracts;
    existing.payload.legs.push(...signal.legs);
    state.stats.deduped++;
    return;
  }

  // Store and dispatch
  state.recentSignals.set(dedupKey, { payload: signal, ts: now });
  state.stats.published++;

  // Cleanup old entries
  if (state.recentSignals.size > 5000) {
    const cutoff = now - CFG.dedupWindowMs * 10;
    for (const [k, v] of state.recentSignals.entries()) {
      if (v.ts < cutoff) state.recentSignals.delete(k);
    }
  }

  // Dispatch to all handlers
  await Promise.allSettled(state.handlers.map((h) => h(signal)));
}

export function getAggregatorStats() {
  return { ...state.stats };
}

export function resetAggregator() {
  state.recentSignals.clear();
  state.stats = { ingested: 0, deduped: 0, published: 0, belowThreshold: 0 };
}
