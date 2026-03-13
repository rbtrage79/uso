/**
 * Signal Enricher — main orchestrator.
 *
 * Takes a DetectedSignalPayload and a window of recent signals,
 * runs all enrichment modules in sequence, and returns a FullyEnrichedSignal.
 *
 * Usage:
 *   const enriched = await enrichSignal(payload, recentSignals);
 */

import { enrichEvents, type EventEnrichment } from "./event-enricher";
import { enrichPeers, type PeerEnrichment, type PeerSignalSummary } from "./peer-enricher";
import { enrichThemes, type ThemeEnrichment, type ActiveThemeSignal } from "./theme-enricher";
import { enrichFactors, type FactorEnrichment, type FactorSignalInput } from "./factor-enricher";
import { generateInsights, type InsightPayload, type InsightInput } from "./insight-generator";
import { rankSignal, type RankingResult, type RankingInput } from "./alert-ranker";
import type { DetectedSignalPayload, Direction } from "@/types/signals";

/**
 * Narrows the Prisma Direction enum (which includes "mixed") to the union
 * accepted by enrichment helpers ("bullish" | "bearish" | "neutral").
 * "mixed" signals (e.g. straddles) are non-directional → "neutral".
 */
function toNarrowDirection(d: Direction): "bullish" | "bearish" | "neutral" {
  return d === "mixed" ? "neutral" : d;
}

export interface FullyEnrichedSignal {
  // Base payload
  payload: DetectedSignalPayload;

  // Enrichment layers
  events: EventEnrichment;
  peers: PeerEnrichment;
  themes: ThemeEnrichment;
  factors: FactorEnrichment;
  insights: InsightPayload;
  ranking: RankingResult;

  // Convenience top-level fields
  feedScore: number;
  institutionalScore: number;
  unusualness: InsightPayload["unusualness"];
  primaryTheme?: string;
  primaryThemeEmoji?: string;
  primaryFactor?: string;
  hasKnownCatalyst: boolean;
  earningsWithinExpiry: boolean;
  sector: string;
  industry: string;
  etfMembership: string[];
  activePeers: string[];
}

/** Window of recent signals passed in from the calling context */
export interface RecentSignalContext {
  symbol: string;
  direction: "bullish" | "bearish" | "neutral";
  totalScore: number;
  totalPremium: number;
  dte?: number;
  expiry?: string;
  eventType?: string;
}

export async function enrichSignal(
  payload: DetectedSignalPayload,
  recentSignals: RecentSignalContext[] = [],
  now = new Date(),
): Promise<FullyEnrichedSignal> {
  const primaryLeg = payload.legs[0];
  const dte = primaryLeg?.dte ?? 30;
  const symbol = payload.symbol;

  // ── 1. Event enrichment ─────────────────────────────────────────────────────
  const events = enrichEvents(symbol, dte, now);

  // ── 2. Peer enrichment ──────────────────────────────────────────────────────
  const peerSignals: PeerSignalSummary[] = recentSignals.map((s) => ({
    symbol: s.symbol,
    direction: s.direction,
    totalScore: s.totalScore,
    totalPremium: s.totalPremium,
  }));
  const peers = enrichPeers(symbol, peerSignals);

  // ── 3. Theme enrichment ─────────────────────────────────────────────────────
  const themeSignals: ActiveThemeSignal[] = recentSignals.map((s) => ({
    symbol: s.symbol,
    direction: s.direction,
    totalScore: s.totalScore,
    totalPremium: s.totalPremium,
    dte: s.dte,
    expiry: s.expiry,
    eventType: s.eventType,
  }));
  const themes = enrichThemes(symbol, themeSignals);

  // ── 4. Factor enrichment ────────────────────────────────────────────────────
  const factorSignals: FactorSignalInput[] = recentSignals.map((s) => ({
    symbol: s.symbol,
    direction: s.direction,
    totalScore: s.totalScore,
    totalPremium: s.totalPremium,
  }));
  const factors = enrichFactors(symbol, factorSignals);

  // ── 5. Insight generation ───────────────────────────────────────────────────
  const insightInput: InsightInput = {
    symbol,
    direction: toNarrowDirection(payload.direction),
    optionType: (primaryLeg?.optionType as "call" | "put") ?? "call",
    totalScore: payload.totalScore,
    totalPremium: payload.totalPremium,
    totalContracts: payload.totalContracts,
    dte,
    strike: primaryLeg?.strike,
    underlyingPrice: payload.underlyingPrice,
    signalType: payload.signalType,
    isCombo: payload.isCombo,
    impliedVol: primaryLeg?.impliedVol,
    volOiScore: payload.scoreVolOi,
    notionalScore: payload.scoreNotional,
    noveltyScore: payload.scoreNovelty,
    peerSyncScore: payload.scorePeerSync,
    events, peers, themes, factors,
  };
  const insights = generateInsights(insightInput);

  // ── 6. Alert ranking ────────────────────────────────────────────────────────
  const rankInput: RankingInput = {
    totalScore: payload.totalScore,
    confidence: payload.confidence,
    totalPremium: payload.totalPremium,
    dte,
    noveltyScore: payload.scoreNovelty,
    peerSyncScore: payload.scorePeerSync,
    eventProximityScore: payload.scoreEventProximity,
    detectedAt: now,
    events, peers, themes, factors, insights,
  };
  const ranking = rankSignal(rankInput);

  // ── Convenience fields ──────────────────────────────────────────────────────
  return {
    payload,
    events, peers, themes, factors, insights, ranking,
    feedScore: ranking.feedScore,
    institutionalScore: insights.institutionalScore,
    unusualness: insights.unusualness,
    primaryTheme: themes.primaryThemeName,
    primaryThemeEmoji: themes.primaryCluster?.themeEmoji,
    primaryFactor: factors.primaryRotation?.factorName,
    hasKnownCatalyst: events.hasKnownCatalyst,
    earningsWithinExpiry: events.earningsBeforeExpiry,
    sector: peers.sector,
    industry: peers.industry,
    etfMembership: peers.etfMembership,
    activePeers: peers.activePeerSymbols,
  };
}

/** Enrich a batch of signals with full cross-signal context */
export async function enrichSignalBatch(
  payloads: DetectedSignalPayload[],
  now = new Date(),
): Promise<FullyEnrichedSignal[]> {
  // First pass: build shared context (recent signal window = all payloads)
  const recentCtx: RecentSignalContext[] = payloads.map((p) => ({
    symbol: p.symbol,
    direction: toNarrowDirection(p.direction),
    totalScore: p.totalScore,
    totalPremium: p.totalPremium,
    dte: p.legs[0]?.dte,
  }));

  // Enrich each signal with full context
  return Promise.all(payloads.map((p) => enrichSignal(p, recentCtx, now)));
}
