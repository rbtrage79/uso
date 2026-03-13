// Re-export all domain types

export * from "./polygon";
export * from "./signals";

// ─── Underlying (UI enriched) ─────────────────────────────────────────────────

export interface UnderlyingUI {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  avgVolume30d?: number;
  beta?: number;
  currentPrice?: number;
  dayChange?: number;
  dayChangePercent?: number;
}

// ─── Theme ─────────────────────────────────────────────────────────────────────

export interface ThemeUI {
  id: string;
  name: string;
  slug: string;
  emoji?: string;
  color?: string;
  description?: string;
  memberCount: number;
  totalPremiumToday: number;
  signalCount: number;
  dominantDirection?: "bullish" | "bearish" | "mixed";
}

// ─── Ticker page data ─────────────────────────────────────────────────────────

export interface TickerPageData {
  underlying: UnderlyingUI;
  signals: import("./signals").EnrichedSignal[];
  chainSnapshot: OptionChainRow[];
  upcomingEvents: EventItem[];
  ivHistory: { date: string; iv: number }[];
  oiHistory: { date: string; oi: number }[];
  volumeHistory: { date: string; volume: number }[];
}

export interface OptionChainRow {
  strike: number;
  expiration: string;
  dte: number;
  callBid: number;
  callAsk: number;
  callIV: number;
  callDelta: number;
  callOI: number;
  callVolume: number;
  callOIChange: number;
  putBid: number;
  putAsk: number;
  putIV: number;
  putDelta: number;
  putOI: number;
  putVolume: number;
  putOIChange: number;
  isATM: boolean;
}

export interface EventItem {
  type: "earnings" | "fda" | "macro";
  name: string;
  date: Date;
  daysAway: number;
  importance: "high" | "medium" | "low";
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface AppSettings {
  // ── Data source ──
  mockMode: boolean;

  // ── Display / alert ──
  soundAlerts: boolean;
  alertThreshold: number;        // min score to trigger sound (30-95)
  autoRefresh: boolean;
  refreshInterval: number;       // seconds (5-120)
  theme: "dark" | "darker";

  // ── Noise filter thresholds (user-tunable) ──
  minSignalScore: number;        // min composite score to show in feed (30-90)
  minNotional: number;           // min premium $ (10k-5M)
  minContracts: number;          // min contracts (10-1000)
  maxDte: number;                // max days-to-expiration (1-365)

  // ── Vol/OI sensitivity ──
  volOiNoteworthy: number;       // ratio to flag as noteworthy (default 0.5)
  volOiUnusual: number;          // ratio to flag as unusual (default 1.0)
  volOiExtreme: number;          // ratio to flag as extreme (default 2.5)

  // ── Notional size tiers ──
  notionalLarge: number;         // "large" tier $ (default 250k)
  notionalHuge: number;          // "huge" tier $ (default 1M)
  notionalWhale: number;         // "whale" tier $ (default 5M)

  // ── Score publication gate ──
  minPublishScore: number;       // min score to publish to feed (40-90)

  // ── Quality control ──
  offHoursMinScore: number;      // min score for off-hours signals (50-90)
  dedupWindowMinutes: number;    // dedup suppression window in minutes (1-30)
  suppressTinyLot: boolean;      // suppress signals below soft contract floor
  suppressDuplicates: boolean;   // apply dedup filter

  // ── Breaking-sensitivity preset ──
  breakingSensitivity: "low" | "medium" | "high";
}

export const DEFAULT_SETTINGS: AppSettings = {
  // Data source
  mockMode: true,

  // Display / alert
  soundAlerts: false,
  alertThreshold: 75,
  autoRefresh: true,
  refreshInterval: 15,
  theme: "dark",

  // Noise filters
  minSignalScore: 55,
  minNotional: 50_000,
  minContracts: 100,
  maxDte: 90,

  // Vol/OI
  volOiNoteworthy: 0.5,
  volOiUnusual: 1.0,
  volOiExtreme: 2.5,

  // Notional tiers
  notionalLarge: 250_000,
  notionalHuge: 1_000_000,
  notionalWhale: 5_000_000,

  // Publication gate
  minPublishScore: 55,

  // Quality control
  offHoursMinScore: 70,
  dedupWindowMinutes: 5,
  suppressTinyLot: true,
  suppressDuplicates: true,

  // Breaking sensitivity
  breakingSensitivity: "medium",
};

// ─── Signal Filters ────────────────────────────────────────────────────────────

export interface SignalFilters {
  direction: "all" | "bullish" | "bearish" | "neutral";
  minScore: number;
  minPremium: number;
  signalType: "all" | "sweep" | "block" | "repeat_sweep" | "combo";
  maxDte: number;
  symbols?: string[];
}
