/**
 * Alert Ranker — produces a composite feed score for ranking signals in the feed.
 *
 * Combines: novelty, confidence, premium size, event proximity,
 * peer outlier score, theme/factor sync, and recency decay.
 *
 * Output: feedScore (0-100) + individual components for transparency.
 */

import type { EventEnrichment } from "./event-enricher";
import type { PeerEnrichment } from "./peer-enricher";
import type { ThemeEnrichment } from "./theme-enricher";
import type { FactorEnrichment } from "./factor-enricher";
import type { InsightPayload } from "./insight-generator";

export interface RankingInput {
  totalScore: number;            // 0-100 from scoring engine
  confidence: number;            // 0-1
  totalPremium: number;
  dte: number;
  noveltyScore?: number;         // 0-100
  peerSyncScore?: number;        // 0-100
  eventProximityScore?: number;  // 0-100
  detectedAt: Date;
  events: EventEnrichment;
  peers: PeerEnrichment;
  themes: ThemeEnrichment;
  factors: FactorEnrichment;
  insights: InsightPayload;
}

export interface RankingResult {
  /** Final feed placement score (0-100, higher = shown higher in feed) */
  feedScore: number;

  /** Component breakdown */
  components: {
    baseSignal: number;        // weighted from totalScore + confidence
    premiumSize: number;       // notional tier contribution
    eventBoost: number;        // catalyst proximity bonus
    peerOutlier: number;       // isolation vs peers
    themeSync: number;         // theme cluster activity
    factorSync: number;        // factor rotation signal
    noveltyBoost: number;      // no-known-event novelty
    recencyDecay: number;      // age penalty (0 = fresh, 1 = fully decayed)
    institutionalBoost: number;// institutional-looking bonus
  };

  /** Recency decay factor (0-1; applied as multiplier) */
  recencyDecay: number;

  /** Human-readable placement reason */
  placementReason: string;
}

const WEIGHTS = {
  baseSignal: 0.35,
  premiumSize: 0.12,
  eventBoost: 0.15,
  peerOutlier: 0.08,
  themeSync: 0.10,
  factorSync: 0.07,
  noveltyBoost: 0.08,
  institutionalBoost: 0.05,
};

/** Recency decay: full score for first 5 min, linear decay to 0.3 at 4 hours */
function calcRecencyDecay(detectedAt: Date): number {
  const ageMs = Date.now() - detectedAt.getTime();
  const ageMin = ageMs / 60_000;
  if (ageMin <= 5) return 1.0;
  if (ageMin >= 240) return 0.3;
  return 1.0 - (ageMin - 5) / (240 - 5) * 0.7;
}

function premiumScore(premium: number): number {
  if (premium >= 5_000_000) return 100;
  if (premium >= 1_000_000) return 80;
  if (premium >= 500_000)   return 65;
  if (premium >= 250_000)   return 50;
  if (premium >= 50_000)    return 30;
  return 10;
}

export function rankSignal(input: RankingInput): RankingResult {
  const { totalScore, confidence, totalPremium, detectedAt, events, peers, themes, factors, insights } = input;

  const baseSignal = Math.round(totalScore * 0.7 + confidence * 100 * 0.3);
  const prem = premiumScore(totalPremium);

  const eventBoost = Math.min(100, (input.eventProximityScore ?? 0) * 1.2);

  // Peer outlier: either isolated (outlier) or synchronized (sync) — both are interesting
  const peerInterest = Math.max(peers.peerOutlierScore, peers.peerSyncScore);

  const themeSync = themes.themeSyncScore;
  const factorSync = factors.factorRotationScore;
  const novelty = input.noveltyScore ?? (events.hasKnownCatalyst ? 10 : 60);

  const institutionalBoost = insights.institutionalLook ? insights.institutionalScore : 20;

  const preDecay =
    baseSignal * WEIGHTS.baseSignal +
    prem * WEIGHTS.premiumSize +
    eventBoost * WEIGHTS.eventBoost +
    peerInterest * WEIGHTS.peerOutlier +
    themeSync * WEIGHTS.themeSync +
    factorSync * WEIGHTS.factorSync +
    novelty * WEIGHTS.noveltyBoost +
    institutionalBoost * WEIGHTS.institutionalBoost;

  const decay = calcRecencyDecay(detectedAt);
  const feedScore = Math.min(100, Math.round(preDecay * decay));

  const placementReason = buildPlacementReason(
    feedScore, baseSignal, eventBoost, themeSync, peerInterest, insights,
  );

  return {
    feedScore,
    components: {
      baseSignal,
      premiumSize: prem,
      eventBoost,
      peerOutlier: peers.peerOutlierScore,
      themeSync,
      factorSync,
      noveltyBoost: novelty,
      recencyDecay: decay,
      institutionalBoost,
    },
    recencyDecay: decay,
    placementReason,
  };
}

function buildPlacementReason(
  feedScore: number,
  baseSignal: number,
  eventBoost: number,
  themeSync: number,
  peerInterest: number,
  insights: InsightPayload,
): string {
  const parts: string[] = [];
  if (feedScore >= 85) parts.push("top-tier signal");
  if (baseSignal >= 80) parts.push("very high base score");
  if (eventBoost >= 60) parts.push(`${insights.catalystDescription ?? "known catalyst"} proximity`);
  if (themeSync >= 50) parts.push("theme cluster active");
  if (peerInterest >= 60) parts.push("peer synchronization");
  if (insights.institutionalLook) parts.push("institutional sizing");
  if (insights.unusualness === "extreme") parts.push("extreme unusualness");
  return parts.length > 0 ? parts.join(" · ") : `score ${feedScore}`;
}

/** Sort a list of signals by feed score descending */
export function rankSignals<T extends { feedScore?: number; totalScore: number }>(signals: T[]): T[] {
  return [...signals].sort((a, b) => (b.feedScore ?? b.totalScore) - (a.feedScore ?? a.totalScore));
}
