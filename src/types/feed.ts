export type DirectionType = "bullish" | "bearish" | "neutral";
export type UnusualnessTier = "routine" | "noteworthy" | "unusual" | "extreme";
export type ExplanationStyle = "tweetShort" | "retailPlain" | "traderPro";
export type SignalKind = "sweep" | "block" | "combo" | "repeat_sweep" | "dark_pool" | "single";

export interface EventBadge {
  type: "earnings" | "fda" | "fomc" | "cpi" | "nfp" | "opex" | "macro";
  label: string;
  daysAway: number;
  importance: "critical" | "high" | "medium" | "low";
  beforeExpiry: boolean;
  emoji: string;
}

export interface FeedPostLeg {
  optionType: "call" | "put";
  strike: number;
  expiration: string;   // "Apr 16"
  expirationISO: string;
  dte: number;
  side: "buy" | "sell";
  contracts: number;
  premium: number;
  impliedVol: number;   // 0-1 decimal
  delta?: number;
}

export interface MergedPrint {
  timeAgo: string;
  contracts: number;
  premium: number;
}

export interface FeedPost {
  id: string;

  // Ticker
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;

  // Signal kind
  signalKind: SignalKind;
  signalLabel: string;          // "Sweep" | "Block" | "Combo" | "Repeat Sweep" etc.
  direction: DirectionType;
  isCombo: boolean;
  legs: FeedPostLeg[];

  // Primary leg display fields
  optionType: "call" | "put" | "mixed";
  strike: number;
  expiration: string;           // "Apr 16"
  expirationISO: string;        // "2026-04-16"
  dte: number;

  // Volume / contract data
  contracts: number;
  premium: number;              // total notional USD
  volOiRatio: number;
  openInterest: number;
  impliedVol: number;           // 0-1 decimal
  delta?: number;
  underlyingPrice?: number;

  // Scores
  totalScore: number;           // 0-100
  feedScore: number;            // 0-100
  noveltyScore: number;         // 0-100
  institutionalScore: number;   // 0-100
  confidence: number;           // 0-1
  unusualness: UnusualnessTier;

  // Events
  hasKnownCatalyst: boolean;
  events: EventBadge[];
  nearestEventLabel?: string;
  daysToNearestEvent?: number;
  earningsWithinExpiry: boolean;

  // Context
  primaryTheme?: string;
  primaryThemeEmoji?: string;
  primaryFactor?: string;
  primaryFactorEmoji?: string;
  activePeers: string[];
  etfMembership: string[];

  // Feed content
  tags: string[];
  explanations: {
    tweetShort: string;
    retailPlain: string;
    traderPro: string;
  };
  oneLiner: string;

  // Metadata
  detectedAt: string;           // ISO timestamp
  timeAgo: string;

  // Dedup / merge
  isDuplicate?: boolean;
  mergedCount?: number;
  mergedPrints?: MergedPrint[];

  // Sparkline (20 price ticks, normalized 0-1)
  sparklineData: number[];
  sparklineTrend: "up" | "down" | "flat";
}
