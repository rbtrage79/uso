// Internal signal and scoring types

import type { Direction, SignalType, TradeSide, OptionType } from "@prisma/client";

export type { Direction, SignalType, TradeSide, OptionType };

// ─── Scoring ──────────────────────────────────────────────────────────────────

export interface ScoringDimensions {
  /** Volume vs open interest ratio anomaly (0-100) */
  volOi: number;
  /** Absolute notional / premium size (0-100) */
  notional: number;
  /** Time-of-day abnormality (0-100) */
  timeOfDay: number;
  /** IV vs trailing historical range (0-100) */
  ivAbnormality: number;
  /** OI change velocity (0-100) */
  oiVelocity: number;
  /** Proximity to earnings / FDA / macro event (0-100) */
  eventProximity: number;
  /** Peer / sector synchronization (0-100) */
  peerSync: number;
  /** Directional confidence (0-100) */
  directionality: number;
  /** Multi-leg combo structure confidence (0-100) */
  combo: number;
  /** Theme-level cluster synchronization (0-100) */
  themeSync: number;
  /** No-known-event novelty score (0-100) */
  novelty: number;
}

export const SCORING_WEIGHTS: Record<keyof ScoringDimensions, number> = {
  volOi: 0.15,
  notional: 0.12,
  timeOfDay: 0.05,
  ivAbnormality: 0.10,
  oiVelocity: 0.08,
  eventProximity: 0.12,
  peerSync: 0.08,
  directionality: 0.10,
  combo: 0.08,
  themeSync: 0.07,
  novelty: 0.05,
};

export interface ScoreResult {
  totalScore: number; // 0-100
  confidence: number; // 0-1
  dimensions: ScoringDimensions;
  direction: Direction;
}

// ─── Trade Leg (pre-signal, raw aggregation) ──────────────────────────────────

export interface RawTradeLeg {
  contractTicker: string;
  underlying: string;
  expirationDate: Date;
  strike: number;
  optionType: OptionType;
  dte: number;
  side: TradeSide;
  quantity: number;
  premium: number;
  priceAtTrade: number;
  underlyingPrice?: number;
  impliedVol?: number;
  delta?: number;
  openInterest?: number;
  dayVolume?: number;
  tradeTime: Date;
}

// ─── Detected Signal (pre-DB, in-memory) ──────────────────────────────────────

export interface DetectedSignalPayload {
  symbol: string;
  signalType: SignalType;
  direction: Direction;
  totalScore: number;
  confidence: number;
  totalPremium: number;
  totalContracts: number;
  isCombo: boolean;
  scoreVolOi?: number;
  scoreNotional?: number;
  scoreTimeOfDay?: number;
  scoreIvAbnormality?: number;
  scoreOiVelocity?: number;
  scoreEventProximity?: number;
  scorePeerSync?: number;
  scoreDirectionality?: number;
  scoreCombo?: number;
  scoreThemeSync?: number;
  scoreNovelty?: number;
  underlyingPrice?: number;
  nearestEventType?: string;
  nearestEventDate?: Date;
  daysToNearestEvent?: number;
  themeId?: string;
  legs: RawTradeLeg[];
}

// ─── Feed Post (pre-DB) ────────────────────────────────────────────────────────

export interface FeedPostPayload {
  signalId: string;
  headline: string;
  body: string;
  emoji: string;
  direction: Direction;
  totalScore: number;
  premium: number;
  tags: string[];
}

// ─── Signal with enrichment (for UI) ─────────────────────────────────────────

export interface EnrichedSignal {
  id: string;
  symbol: string;
  signalType: SignalType;
  direction: Direction;
  totalScore: number;
  confidence: number;
  totalPremium: number;
  totalContracts: number;
  isCombo: boolean;
  detectedAt: Date;
  legs: SignalLegUI[];
  scoreBreakdown: Partial<ScoringDimensions>;
  context: SignalContext;
  feedPost?: FeedPostUI;
}

export interface SignalLegUI {
  contractTicker: string;
  strike: number;
  expiration: Date;
  optionType: OptionType;
  dte: number;
  side: TradeSide;
  quantity: number;
  premium: number;
  impliedVol?: number;
  delta?: number;
  openInterest?: number;
}

export interface SignalContext {
  underlyingPrice?: number;
  nearestEventType?: string;
  nearestEventDate?: Date;
  daysToNearestEvent?: number;
  theme?: string;
  peers?: string[];
  /** Full enrichment (present when signal has been run through signal-enricher) */
  enrichment?: SignalEnrichmentContext;
}

export interface FeedPostUI {
  id: string;
  headline: string;
  body: string;
  emoji: string;
  tags: string[];
  publishedAt: Date;
}

// ─── Enriched context (attached to EnrichedSignal for UI) ────────────────────

export interface SignalEnrichmentContext {
  // Event
  hasKnownCatalyst: boolean;
  earningsWithinExpiry: boolean;
  isEarningsPlay: boolean;
  isFdaPlay: boolean;
  isMacroPlay: boolean;
  daysToEarnings?: number | null;
  daysToFda?: number | null;
  daysToMacro?: number | null;
  daysToOpex?: number | null;
  nearestEventName?: string;
  nearestEventDate?: Date;
  daysToNearestEvent?: number;

  // Peer
  sector?: string;
  industry?: string;
  subIndustry?: string;
  etfMembership?: string[];
  activePeers?: string[];
  peerOutlierScore?: number;
  peerSyncScore?: number;
  peerConsensusDirection?: "bullish" | "bearish" | "mixed" | "none";

  // Theme
  themeIds?: string[];
  themeNames?: string[];
  primaryTheme?: string;
  primaryThemeEmoji?: string;
  primaryThemeColor?: string;
  themeSyncScore?: number;

  // Factor
  factorIds?: string[];
  primaryFactor?: string;
  primaryFactorEmoji?: string;
  factorRotationScore?: number;
  rotationNarrative?: string;

  // Insights
  whatTheyMayBeBettingOn?: string;
  whyInterestingNow?: string;
  whatCouldInvalidate?: string;
  unusualness?: "routine" | "noteworthy" | "unusual" | "extreme";
  unusualnessReason?: string;
  institutionalLook?: boolean;
  institutionalScore?: number;
  institutionalReasons?: string[];
  directionSummary?: string;
  oneLiner?: string;

  // Ranking
  feedScore?: number;
  recencyDecay?: number;
  placementReason?: string;
}

// ─── Filter state ─────────────────────────────────────────────────────────────

export interface SignalFilters {
  direction?: Direction | "all";
  minScore?: number;
  minPremium?: number;
  signalType?: SignalType | "all";
  symbols?: string[];
  maxDte?: number;
  dateRange?: { from: Date; to: Date };
}
