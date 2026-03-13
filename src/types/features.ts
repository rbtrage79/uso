/**
 * Feature-specific domain types for advanced platform features:
 * scoring labels, saved filters, alert subscriptions, heatmap, screener, recap.
 */

import type { SignalFilters, EnrichedSignal } from "./signals";

// ─── Scoring Labels ───────────────────────────────────────────────────────────

export type ScoreLabel =
  | "Quiet Accumulation"
  | "Event Chase"
  | "Hedge Wave"
  | "Breakout Speculation"
  | "Volatility Bid"
  | "Theme Synchronization"
  | "Sector Rotation"
  | "Factor Rotation"
  | "Smart Money? Low Confidence"
  | "Smart Money? High Confidence";

export interface ScoreLabelMeta {
  color: string;        // Tailwind text color class
  bgColor: string;      // Tailwind bg color class
  borderColor: string;  // Tailwind border color class
  description: string;  // Short human-readable description
  icon: string;         // lucide-react icon name
  shortLabel: string;   // Abbreviated label for compact badges
}

export const SCORE_LABEL_META: Record<ScoreLabel, ScoreLabelMeta> = {
  "Quiet Accumulation": {
    color: "text-violet-300",
    bgColor: "bg-violet-950/60",
    borderColor: "border-violet-700/50",
    description: "Unusual flow with no known catalyst — possible quiet positioning",
    icon: "Ghost",
    shortLabel: "Quiet Accum.",
  },
  "Event Chase": {
    color: "text-amber-300",
    bgColor: "bg-amber-950/60",
    borderColor: "border-amber-700/50",
    description: "Flow timed directly around an upcoming earnings, FDA, or macro event",
    icon: "CalendarClock",
    shortLabel: "Event Chase",
  },
  "Hedge Wave": {
    color: "text-rose-300",
    bgColor: "bg-rose-950/60",
    borderColor: "border-rose-700/50",
    description: "Large bearish or protective flow — consistent with institutional hedging",
    icon: "Shield",
    shortLabel: "Hedge Wave",
  },
  "Breakout Speculation": {
    color: "text-emerald-300",
    bgColor: "bg-emerald-950/60",
    borderColor: "border-emerald-700/50",
    description: "High vol/OI with aggressive directional buying — speculative breakout bet",
    icon: "Rocket",
    shortLabel: "Breakout",
  },
  "Volatility Bid": {
    color: "text-sky-300",
    bgColor: "bg-sky-950/60",
    borderColor: "border-sky-700/50",
    description: "Multi-leg neutral structure — bidding on a move in either direction",
    icon: "Waves",
    shortLabel: "Vol Bid",
  },
  "Theme Synchronization": {
    color: "text-cyan-300",
    bgColor: "bg-cyan-950/60",
    borderColor: "border-cyan-700/50",
    description: "Flow aligns with a broader theme basket — multiple tickers moving together",
    icon: "Network",
    shortLabel: "Theme Sync",
  },
  "Sector Rotation": {
    color: "text-teal-300",
    bgColor: "bg-teal-950/60",
    borderColor: "border-teal-700/50",
    description: "Coordinated flow across sector peers — possible rotation signal",
    icon: "ArrowLeftRight",
    shortLabel: "Sector Rot.",
  },
  "Factor Rotation": {
    color: "text-indigo-300",
    bgColor: "bg-indigo-950/60",
    borderColor: "border-indigo-700/50",
    description: "Flow concentrated in a factor bucket — momentum, value, growth, or macro",
    icon: "GitMerge",
    shortLabel: "Factor Rot.",
  },
  "Smart Money? Low Confidence": {
    color: "text-zinc-300",
    bgColor: "bg-zinc-800/60",
    borderColor: "border-zinc-600/50",
    description: "Score is elevated but confidence in the signal is relatively low",
    icon: "HelpCircle",
    shortLabel: "Smart? Low",
  },
  "Smart Money? High Confidence": {
    color: "text-yellow-300",
    bgColor: "bg-yellow-950/60",
    borderColor: "border-yellow-700/50",
    description: "High composite score AND high confidence — strong institutional signal",
    icon: "Zap",
    shortLabel: "Smart Money",
  },
};

// ─── Saved Filters ────────────────────────────────────────────────────────────

export interface SavedFilter {
  id: string;
  name: string;
  createdAt: string; // ISO timestamp
  filters: SignalFilters;
}

// ─── Alert Subscriptions ──────────────────────────────────────────────────────

export type AlertChannel = "in-app" | "browser" | "email";

export interface AlertSubscription {
  id: string;
  name: string;
  symbol?: string;          // undefined = any symbol
  threshold: number;        // minimum totalScore (0–100)
  labelTypes: ScoreLabel[]; // empty = any label
  direction?: "bullish" | "bearish" | "neutral"; // undefined = any
  channels: AlertChannel[];
  enabled: boolean;
}

// ─── Strike Heatmap ──────────────────────────────────────────────────────────

export interface HeatmapCell {
  strike: number;
  expiration: string;   // "Mar 21"
  expirationISO: string; // "2026-03-21"
  dte: number;
  callOI: number;
  putOI: number;
  callVolume: number;
  putVolume: number;
  callPremium: number;  // USD
  putPremium: number;   // USD
  netFlow: "call" | "put" | "neutral";
  intensity: number;    // 0–1 for background color
  isATM: boolean;
}

// ─── Screener / Top Lists ─────────────────────────────────────────────────────

export interface TopListItem {
  rank: number;
  signal: EnrichedSignal;
  label: ScoreLabel;
  category: "calls" | "puts" | "iv_spike" | "no_event" | "biotech";
  highlightDim?: keyof EnrichedSignal["scoreBreakdown"]; // which score to highlight
}

export interface ThemeCluster {
  themeId: string;
  themeName: string;
  emoji: string;
  color: string;
  signals: EnrichedSignal[];
  avgScore: number;
  totalPremium: number;
  signalCount: number;
  dominantDirection: "bullish" | "bearish" | "neutral" | "mixed";
  topSymbols: string[];
  labels: ScoreLabel[];
}

export interface FactorCluster {
  factorId: string;
  factorName: string;
  emoji: string;
  color: string;
  description: string;
  signals: EnrichedSignal[];
  avgScore: number;
  totalPremium: number;
  signalCount: number;
  dominantDirection: "bullish" | "bearish" | "neutral" | "mixed";
  topSymbols: string[];
}

// ─── EOD Recap ────────────────────────────────────────────────────────────────

export interface RecapStat {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "flat";
  color?: string; // Tailwind text color class
}

export interface TweetPost {
  index: number;        // 1-based
  body: string;         // raw tweet text (may contain $TICKER, #Hashtag)
  likes: number;
  reposts: number;
  timestamp: string;    // "2:47 PM · Mar 13, 2026"
}

export interface ThingToWatch {
  rank: number;
  title: string;
  symbols: string[];
  description: string;
  catalyst?: "earnings" | "fda" | "technical" | "theme" | "macro";
  label: ScoreLabel;
  emoji: string;
}

export interface DayRecap {
  date: string;         // "March 13, 2026"
  dateISO: string;      // "2026-03-13"
  stats: RecapStat[];
  tweetThread: TweetPost[];
  fiveThings: ThingToWatch[];
  topSignalId: string;  // references MOCK_SIGNALS entry
}
