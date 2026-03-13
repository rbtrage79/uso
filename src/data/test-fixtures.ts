/**
 * Test Fixtures — 7 archetypal unusual-flow scenarios
 *
 * Each fixture includes:
 *  - A DetectedSignalPayload (what the detector emits)
 *  - The expected QC outcome
 *  - Expected direction / score range
 *  - Human-readable scenario description
 *
 * Used by:
 *  - Unit tests (src/lib/__tests__/)
 *  - Backtest replay tool (seed data for specific scenario types)
 *  - Signal quality dashboard (benchmark baseline)
 */

import type { DetectedSignalPayload } from "@/types/signals";

export interface TestFixture {
  id: string;
  scenario: string;
  description: string;
  tags: string[];
  signal: DetectedSignalPayload;
  expected: {
    direction: "bullish" | "bearish" | "neutral";
    minScore: number;
    maxScore: number;
    passes_qc: boolean;
    key_dimensions: string[];  // which scoring dims should be high
  };
}

// ─── Helper to build minimal legs ────────────────────────────────────────────

function makeLeg(
  symbol: string,
  type: "call" | "put",
  strike: number,
  expiry: string,
  dte: number,
  qty: number,
  premium: number,
  iv: number,
  oi: number,
  side: "buy" | "sell" = "buy",
) {
  return {
    contractTicker: `O:${symbol}${expiry.replace(/-/g, "")}${type === "call" ? "C" : "P"}${String(strike * 1000).padStart(8, "0")}`,
    symbol,
    optionType: type,
    strike,
    expirationDate: expiry,
    dte,
    side,
    quantity: qty,
    premium,
    impliedVol: iv,
    openInterest: oi,
    delta: type === "call" ? 0.35 : -0.35,
    underlyingPrice: strike * (type === "call" ? 0.92 : 1.08),
  };
}

// ─── Fixture 1: Earnings Run-Up Call Sweep ────────────────────────────────────

export const FIXTURE_EARNINGS_RUNUP: TestFixture = {
  id: "fixture_earnings_runup",
  scenario: "Earnings Run-Up Flow",
  description:
    "Large bullish call sweep on NVDA placed 8 days before earnings, " +
    "high vol/OI ratio, earnings fall within expiry. Classic institutional " +
    "positioning play — buy the run-up, capture IV expansion.",
  tags: ["earnings", "sweep", "bullish", "IV_expansion", "institutional"],
  signal: {
    symbol: "NVDA",
    signalType: "sweep",
    direction: "bullish",
    totalScore: 88,
    confidence: 0.82,
    totalPremium: 2_850_000,
    totalContracts: 3_200,
    isCombo: false,
    detectedAt: new Date("2026-03-10T14:22:00Z"),
    underlyingPrice: 878,
    nearestEventType: "earnings",
    nearestEventDate: new Date("2026-03-18T20:00:00Z"),
    daysToNearestEvent: 8,
    scoreVolOi: 85,
    scoreNotional: 92,
    scoreTimeOfDay: 60,
    scoreIvAbnormality: 78,
    scoreEventProximity: 95,
    scoreDirectionality: 82,
    legs: [
      makeLeg("NVDA", "call", 900, "2026-03-21", 11, 3200, 2_850_000, 0.74, 1_812),
    ],
  },
  expected: {
    direction: "bullish",
    minScore: 80,
    maxScore: 100,
    passes_qc: true,
    key_dimensions: ["eventProximity", "notional", "volOi"],
  },
};

// ─── Fixture 2: Biotech PDUFA Speculation ─────────────────────────────────────

export const FIXTURE_PDUFA_SPEC: TestFixture = {
  id: "fixture_pdufa_spec",
  scenario: "Biotech PDUFA Speculation",
  description:
    "Aggressive OTM call buying on MRNA ahead of a major FDA PDUFA decision. " +
    "High open interest change velocity (new positions being opened). " +
    "No earnings catalyst — purely FDA-driven binary event bet.",
  tags: ["FDA", "PDUFA", "biotech", "OTM_calls", "binary_event"],
  signal: {
    symbol: "MRNA",
    signalType: "block",
    direction: "bullish",
    totalScore: 82,
    confidence: 0.71,
    totalPremium: 1_440_000,
    totalContracts: 4_800,
    isCombo: false,
    detectedAt: new Date("2026-03-11T10:05:00Z"),
    underlyingPrice: 48.20,
    nearestEventType: "fda",
    nearestEventDate: new Date("2026-03-20T00:00:00Z"),
    daysToNearestEvent: 9,
    scoreVolOi: 91,
    scoreNotional: 80,
    scoreTimeOfDay: 55,
    scoreIvAbnormality: 86,
    scoreEventProximity: 90,
    scoreDirectionality: 72,
    legs: [
      makeLeg("MRNA", "call", 55, "2026-03-21", 10, 4800, 1_440_000, 1.24, 420),
    ],
  },
  expected: {
    direction: "bullish",
    minScore: 75,
    maxScore: 100,
    passes_qc: true,
    key_dimensions: ["eventProximity", "ivAbnormality", "volOi"],
  },
};

// ─── Fixture 3: Macro Event Hedging ───────────────────────────────────────────

export const FIXTURE_MACRO_HEDGE: TestFixture = {
  id: "fixture_macro_hedge",
  scenario: "Macro Event Hedging",
  description:
    "Large put spread on SPY placed 2 days before FOMC rate decision. " +
    "Protective hedge structure (call sold + put bought). " +
    "Notional suggests institutional portfolio hedge, not directional bet.",
  tags: ["FOMC", "macro", "hedge", "put_spread", "SPY", "portfolio_protection"],
  signal: {
    symbol: "SPY",
    signalType: "sweep",
    direction: "bearish",
    totalScore: 74,
    confidence: 0.66,
    totalPremium: 4_200_000,
    totalContracts: 8_500,
    isCombo: true,
    detectedAt: new Date("2026-03-12T09:45:00Z"),
    underlyingPrice: 594,
    nearestEventType: "macro",
    nearestEventDate: new Date("2026-03-14T14:00:00Z"),
    daysToNearestEvent: 2,
    scoreVolOi: 65,
    scoreNotional: 95,
    scoreTimeOfDay: 70,
    scoreIvAbnormality: 72,
    scoreEventProximity: 88,
    scoreDirectionality: 58,
    legs: [
      makeLeg("SPY", "put",  585, "2026-03-21", 9, 8500, 3_400_000, 0.18, 24_300, "buy"),
      makeLeg("SPY", "put",  575, "2026-03-21", 9, 8500,   800_000, 0.15, 18_200, "sell"),
    ],
  },
  expected: {
    direction: "bearish",
    minScore: 65,
    maxScore: 90,
    passes_qc: true,
    key_dimensions: ["notional", "eventProximity", "timeOfDay"],
  },
};

// ─── Fixture 4: Zero-Known-Event Speculation (High Novelty) ───────────────────

export const FIXTURE_NO_CATALYST: TestFixture = {
  id: "fixture_no_catalyst",
  scenario: "Zero-Known-Event Speculation",
  description:
    "Large call sweep on PLTR with no earnings, FDA, or macro events " +
    "within expiry. Very high vol/OI ratio. Pattern suggests informed " +
    "flow — possible M&A, product announcement, or insider positioning. " +
    "High novelty score because there is NO known public catalyst.",
  tags: ["no_catalyst", "high_novelty", "informed_flow", "speculative"],
  signal: {
    symbol: "PLTR",
    signalType: "sweep",
    direction: "bullish",
    totalScore: 79,
    confidence: 0.74,
    totalPremium: 980_000,
    totalContracts: 5_600,
    isCombo: false,
    detectedAt: new Date("2026-03-12T11:30:00Z"),
    underlyingPrice: 22.80,
    nearestEventType: undefined,
    nearestEventDate: undefined,
    daysToNearestEvent: undefined,
    scoreVolOi: 94,
    scoreNotional: 75,
    scoreTimeOfDay: 62,
    scoreIvAbnormality: 68,
    scoreEventProximity: 0,
    scoreDirectionality: 86,
    legs: [
      makeLeg("PLTR", "call", 25, "2026-04-17", 36, 5600, 980_000, 0.58, 2_140),
    ],
  },
  expected: {
    direction: "bullish",
    minScore: 70,
    maxScore: 95,
    passes_qc: true,
    key_dimensions: ["volOi", "directionality", "novelty"],
  },
};

// ─── Fixture 5: Theme-Wide Synchronized SaaS Call Buying ──────────────────────

export const FIXTURE_SAAS_THEME_SYNC: TestFixture = {
  id: "fixture_saas_theme_sync",
  scenario: "Theme-Wide Synchronized SaaS Call Buying",
  description:
    "Simultaneous bullish call buying across multiple SaaS names " +
    "(SNOW, CRM, CRWD, DDOG) within a 20-minute window. " +
    "No single name triggers alone — the theme sync signal fires " +
    "because of cross-sector coordination. Possible sector rotation " +
    "into cloud/SaaS ahead of a positive earnings cycle.",
  tags: ["theme_sync", "SaaS", "sector_rotation", "coordinated", "bullish"],
  signal: {
    symbol: "SNOW",
    signalType: "block",
    direction: "bullish",
    totalScore: 77,
    confidence: 0.69,
    totalPremium: 620_000,
    totalContracts: 1_800,
    isCombo: false,
    detectedAt: new Date("2026-03-12T13:45:00Z"),
    underlyingPrice: 142.50,
    nearestEventType: "earnings",
    nearestEventDate: new Date("2026-03-26T20:00:00Z"),
    daysToNearestEvent: 14,
    scoreVolOi: 72,
    scoreNotional: 68,
    scoreTimeOfDay: 55,
    scoreIvAbnormality: 65,
    scoreEventProximity: 60,
    scoreDirectionality: 75,
    legs: [
      makeLeg("SNOW", "call", 150, "2026-04-17", 36, 1800, 620_000, 0.52, 3_420),
    ],
  },
  expected: {
    direction: "bullish",
    minScore: 65,
    maxScore: 90,
    passes_qc: true,
    key_dimensions: ["themeSync", "peerSync", "directionality"],
  },
};

// ─── Fixture 6: Bearish Hedge Put Spread ──────────────────────────────────────

export const FIXTURE_BEARISH_HEDGE: TestFixture = {
  id: "fixture_bearish_hedge",
  scenario: "Bearish Hedge Put Spread",
  description:
    "Institutional-size put spread on QQQ — buying ATM puts, selling OTM puts. " +
    "Structured as a defined-risk hedge (not a naked put buy). " +
    "Premium profile suggests $1.8M max risk. Likely protecting a large " +
    "tech equity portfolio ahead of a high-vol period.",
  tags: ["put_spread", "QQQ", "bearish", "hedge", "institutional", "defined_risk"],
  signal: {
    symbol: "QQQ",
    signalType: "sweep",
    direction: "bearish",
    totalScore: 81,
    confidence: 0.73,
    totalPremium: 1_800_000,
    totalContracts: 6_200,
    isCombo: true,
    detectedAt: new Date("2026-03-12T15:45:00Z"),
    underlyingPrice: 518,
    nearestEventType: "macro",
    nearestEventDate: new Date("2026-03-14T14:00:00Z"),
    daysToNearestEvent: 2,
    scoreVolOi: 78,
    scoreNotional: 87,
    scoreTimeOfDay: 82,   // late-session print
    scoreIvAbnormality: 70,
    scoreEventProximity: 88,
    scoreDirectionality: 76,
    legs: [
      makeLeg("QQQ", "put", 510, "2026-03-21",  9, 6200, 2_480_000, 0.22, 31_400, "buy"),
      makeLeg("QQQ", "put", 495, "2026-03-21",  9, 6200,   680_000, 0.19, 22_100, "sell"),
    ],
  },
  expected: {
    direction: "bearish",
    minScore: 70,
    maxScore: 95,
    passes_qc: true,
    key_dimensions: ["notional", "timeOfDay", "eventProximity"],
  },
};

// ─── Fixture 7: Likely Combo Trade (Straddle) ─────────────────────────────────

export const FIXTURE_COMBO_STRADDLE: TestFixture = {
  id: "fixture_combo_straddle",
  scenario: "Likely Combo Trade — ATM Straddle",
  description:
    "Simultaneous ATM call + put buying on TSLA ahead of earnings. " +
    "Equal notional on both legs, same strike and expiry, arriving within " +
    "500ms. Classic long straddle / volatility purchase — the trader " +
    "expects a big move but is uncertain of direction. IV is low, " +
    "making this an attractive entry for a vol bet.",
  tags: ["straddle", "TSLA", "neutral", "vol_buy", "combo", "earnings"],
  signal: {
    symbol: "TSLA",
    signalType: "sweep",
    direction: "neutral",
    totalScore: 76,
    confidence: 0.64,
    totalPremium: 3_100_000,
    totalContracts: 4_400,
    isCombo: true,
    detectedAt: new Date("2026-03-11T11:15:00Z"),
    underlyingPrice: 248,
    nearestEventType: "earnings",
    nearestEventDate: new Date("2026-03-24T20:00:00Z"),
    daysToNearestEvent: 13,
    scoreVolOi: 80,
    scoreNotional: 88,
    scoreTimeOfDay: 58,
    scoreIvAbnormality: 82,  // low IV → attractive straddle entry
    scoreEventProximity: 75,
    scoreDirectionality: 55,
    legs: [
      makeLeg("TSLA", "call", 250, "2026-03-28", 17, 2200, 1_540_000, 0.61, 8_200, "buy"),
      makeLeg("TSLA", "put",  250, "2026-03-28", 17, 2200, 1_560_000, 0.63, 7_900, "buy"),
    ],
  },
  expected: {
    direction: "neutral",
    minScore: 65,
    maxScore: 90,
    passes_qc: true,
    key_dimensions: ["combo", "notional", "ivAbnormality"],
  },
};

// ─── All fixtures ──────────────────────────────────────────────────────────────

export const ALL_FIXTURES: TestFixture[] = [
  FIXTURE_EARNINGS_RUNUP,
  FIXTURE_PDUFA_SPEC,
  FIXTURE_MACRO_HEDGE,
  FIXTURE_NO_CATALYST,
  FIXTURE_SAAS_THEME_SYNC,
  FIXTURE_BEARISH_HEDGE,
  FIXTURE_COMBO_STRADDLE,
];

/** Get a fixture by scenario ID */
export function getFixture(id: string): TestFixture | undefined {
  return ALL_FIXTURES.find((f) => f.id === id);
}

/** Get fixtures matching specific tags */
export function getFixturesByTag(tag: string): TestFixture[] {
  return ALL_FIXTURES.filter((f) => f.tags.includes(tag));
}
