/**
 * Mock screener data — top lists, theme clusters, factor clusters.
 * References MOCK_SIGNALS plus additional seed signals.
 */

import type { TopListItem, ThemeCluster, FactorCluster } from "@/types/features";
import type { EnrichedSignal } from "@/types/signals";
import { getLabelForSignal } from "@/lib/scoring/label";
import { MOCK_SIGNALS } from "./mock-signals";

const now = new Date();
const ago = (ms: number) => new Date(now.getTime() - ms);
const min = (n: number) => n * 60_000;
const day = (n: number) => new Date(now.getTime() + n * 86_400_000);

// ─── Additional seed signals ──────────────────────────────────────────────────

const EXTRA: EnrichedSignal[] = [
  // sig_011: BNTX — FDA play, bullish, high IV
  {
    id: "sig_011",
    symbol: "BNTX",
    signalType: "single_leg",
    direction: "bullish",
    totalScore: 88,
    confidence: 0.84,
    totalPremium: 1_960_000,
    totalContracts: 4800,
    isCombo: false,
    detectedAt: ago(min(8)),
    legs: [
      {
        contractTicker: "O:BNTX250418C00110000",
        strike: 110,
        expiration: day(45),
        optionType: "call",
        dte: 45,
        side: "buy",
        quantity: 4800,
        premium: 1_960_000,
        impliedVol: 1.12,
        delta: 0.34,
        openInterest: 6_200,
      },
    ],
    scoreBreakdown: {
      volOi: 82,
      notional: 84,
      ivAbnormality: 92,
      eventProximity: 86,
      directionality: 78,
      novelty: 12,
    },
    context: {
      underlyingPrice: 102,
      nearestEventType: "fda",
      nearestEventDate: day(42),
      daysToNearestEvent: 42,
      theme: "Biotech/Genomics",
    },
  },

  // sig_012: REGN — earnings bullish call
  {
    id: "sig_012",
    symbol: "REGN",
    signalType: "sweep",
    direction: "bullish",
    totalScore: 79,
    confidence: 0.76,
    totalPremium: 1_120_000,
    totalContracts: 1800,
    isCombo: false,
    detectedAt: ago(min(18)),
    legs: [
      {
        contractTicker: "O:REGN250221C00900000",
        strike: 900,
        expiration: day(28),
        optionType: "call",
        dte: 28,
        side: "buy",
        quantity: 1800,
        premium: 1_120_000,
        impliedVol: 0.62,
        delta: 0.44,
        openInterest: 9_800,
      },
    ],
    scoreBreakdown: {
      volOi: 74,
      notional: 76,
      ivAbnormality: 68,
      eventProximity: 78,
      directionality: 76,
      novelty: 20,
    },
    context: {
      underlyingPrice: 875,
      nearestEventType: "earnings",
      nearestEventDate: day(26),
      daysToNearestEvent: 26,
      theme: "Biotech/Genomics",
    },
  },

  // sig_013: BIIB — large bearish put, institutional hedge
  {
    id: "sig_013",
    symbol: "BIIB",
    signalType: "block",
    direction: "bearish",
    totalScore: 81,
    confidence: 0.78,
    totalPremium: 2_340_000,
    totalContracts: 5500,
    isCombo: false,
    detectedAt: ago(min(32)),
    legs: [
      {
        contractTicker: "O:BIIB250221P00200000",
        strike: 200,
        expiration: day(28),
        optionType: "put",
        dte: 28,
        side: "buy",
        quantity: 5500,
        premium: 2_340_000,
        impliedVol: 0.88,
        delta: -0.42,
        openInterest: 14_000,
      },
    ],
    scoreBreakdown: {
      volOi: 80,
      notional: 88,
      ivAbnormality: 85,
      directionality: 72,
      peerSync: 62,
      novelty: 45,
    },
    context: {
      underlyingPrice: 218,
      theme: "Biotech/Genomics",
      peers: ["MRNA", "REGN", "BNTX"],
    },
  },

  // sig_014: IWM — neutral straddle, vol bid
  {
    id: "sig_014",
    symbol: "IWM",
    signalType: "combo_straddle",
    direction: "neutral",
    totalScore: 73,
    confidence: 0.69,
    totalPremium: 980_000,
    totalContracts: 2200,
    isCombo: true,
    detectedAt: ago(min(44)),
    legs: [
      {
        contractTicker: "O:IWM250207C00207000",
        strike: 207,
        expiration: day(14),
        optionType: "call",
        dte: 14,
        side: "buy",
        quantity: 1100,
        premium: 490_000,
        impliedVol: 0.24,
        delta: 0.49,
        openInterest: 28_000,
      },
      {
        contractTicker: "O:IWM250207P00207000",
        strike: 207,
        expiration: day(14),
        optionType: "put",
        dte: 14,
        side: "buy",
        quantity: 1100,
        premium: 490_000,
        impliedVol: 0.25,
        delta: -0.51,
        openInterest: 25_000,
      },
    ],
    scoreBreakdown: {
      volOi: 66,
      notional: 70,
      combo: 82,
      eventProximity: 68,
      directionality: 50,
      novelty: 38,
    },
    context: {
      underlyingPrice: 207,
      nearestEventType: "macro",
      nearestEventDate: day(10),
      daysToNearestEvent: 10,
    },
  },

  // sig_015: GS — bearish put, hedge wave
  {
    id: "sig_015",
    symbol: "GS",
    signalType: "block",
    direction: "bearish",
    totalScore: 75,
    confidence: 0.72,
    totalPremium: 1_460_000,
    totalContracts: 3200,
    isCombo: false,
    detectedAt: ago(min(60)),
    legs: [
      {
        contractTicker: "O:GS250221P00480000",
        strike: 480,
        expiration: day(21),
        optionType: "put",
        dte: 21,
        side: "buy",
        quantity: 3200,
        premium: 1_460_000,
        impliedVol: 0.42,
        delta: -0.38,
        openInterest: 18_500,
      },
    ],
    scoreBreakdown: {
      volOi: 72,
      notional: 78,
      ivAbnormality: 62,
      directionality: 74,
      peerSync: 58,
      novelty: 50,
    },
    context: {
      underlyingPrice: 498,
      peers: ["JPM", "MS", "BAC"],
    },
  },

  // sig_016: LLY — GLP-1 theme bullish sweep
  {
    id: "sig_016",
    symbol: "LLY",
    signalType: "sweep",
    direction: "bullish",
    totalScore: 83,
    confidence: 0.80,
    totalPremium: 2_180_000,
    totalContracts: 2100,
    isCombo: false,
    detectedAt: ago(min(72)),
    legs: [
      {
        contractTicker: "O:LLY250321C00820000",
        strike: 820,
        expiration: day(38),
        optionType: "call",
        dte: 38,
        side: "buy",
        quantity: 2100,
        premium: 2_180_000,
        impliedVol: 0.55,
        delta: 0.45,
        openInterest: 12_400,
      },
    ],
    scoreBreakdown: {
      volOi: 78,
      notional: 88,
      ivAbnormality: 72,
      themeSync: 75,
      peerSync: 68,
      directionality: 80,
      novelty: 18,
    },
    context: {
      underlyingPrice: 798,
      theme: "GLP-1 / Obesity",
      peers: ["NVO", "AMGN"],
    },
    feedPost: {
      id: "post_016",
      headline: "🟢 LLY — $2.18M BULLISH Sweep | 820C Mar21 | Score 83",
      body: "GLP-1 theme flow heating up. $2.18M bullish sweep on LLY.\nStrike: $820C (IV 55%) expiring Mar 21 (38DTE)\n🤖 Theme: GLP-1/Obesity — peers NVO, AMGN also active.\nSignal score: 83/100 (confidence: 80%)",
      emoji: "🟢",
      tags: ["$LLY", "#UnusualOptions", "#Bullish", "#GLP1", "#Sweep", "#HighConviction"],
      publishedAt: ago(min(72)),
    },
  },

  // sig_017: PLTR — AI/Defense bullish sweep
  {
    id: "sig_017",
    symbol: "PLTR",
    signalType: "sweep",
    direction: "bullish",
    totalScore: 77,
    confidence: 0.74,
    totalPremium: 890_000,
    totalContracts: 6500,
    isCombo: false,
    detectedAt: ago(min(88)),
    legs: [
      {
        contractTicker: "O:PLTR250221C00085000",
        strike: 85,
        expiration: day(28),
        optionType: "call",
        dte: 28,
        side: "buy",
        quantity: 6500,
        premium: 890_000,
        impliedVol: 0.78,
        delta: 0.38,
        openInterest: 22_000,
      },
    ],
    scoreBreakdown: {
      volOi: 76,
      notional: 68,
      ivAbnormality: 70,
      themeSync: 65,
      peerSync: 60,
      directionality: 78,
      novelty: 55,
    },
    context: {
      underlyingPrice: 78,
      theme: "AI Infrastructure",
      peers: ["NVDA", "AMD"],
    },
  },

  // sig_018: CRSP — Biotech/FDA bullish call
  {
    id: "sig_018",
    symbol: "CRSP",
    signalType: "single_leg",
    direction: "bullish",
    totalScore: 76,
    confidence: 0.73,
    totalPremium: 840_000,
    totalContracts: 3100,
    isCombo: false,
    detectedAt: ago(min(105)),
    legs: [
      {
        contractTicker: "O:CRSP250315C00060000",
        strike: 60,
        expiration: day(32),
        optionType: "call",
        dte: 32,
        side: "buy",
        quantity: 3100,
        premium: 840_000,
        impliedVol: 0.95,
        delta: 0.36,
        openInterest: 8_800,
      },
    ],
    scoreBreakdown: {
      volOi: 78,
      notional: 70,
      ivAbnormality: 88,
      eventProximity: 80,
      directionality: 72,
      novelty: 14,
    },
    context: {
      underlyingPrice: 54,
      nearestEventType: "fda",
      nearestEventDate: day(30),
      daysToNearestEvent: 30,
      theme: "Biotech/Genomics",
    },
  },

  // sig_019: RTX — Defense bullish block
  {
    id: "sig_019",
    symbol: "RTX",
    signalType: "block",
    direction: "bullish",
    totalScore: 70,
    confidence: 0.67,
    totalPremium: 760_000,
    totalContracts: 2800,
    isCombo: false,
    detectedAt: ago(min(120)),
    legs: [
      {
        contractTicker: "O:RTX250221C00125000",
        strike: 125,
        expiration: day(28),
        optionType: "call",
        dte: 28,
        side: "buy",
        quantity: 2800,
        premium: 760_000,
        impliedVol: 0.38,
        delta: 0.45,
        openInterest: 11_200,
      },
    ],
    scoreBreakdown: {
      volOi: 68,
      notional: 64,
      ivAbnormality: 58,
      themeSync: 62,
      peerSync: 56,
      directionality: 70,
      novelty: 60,
    },
    context: {
      underlyingPrice: 122,
      theme: "Defense & Cyber",
      peers: ["LMT", "NOC"],
    },
  },

  // sig_020: NVO — GLP-1 bullish, theme sync
  {
    id: "sig_020",
    symbol: "NVO",
    signalType: "sweep",
    direction: "bullish",
    totalScore: 74,
    confidence: 0.71,
    totalPremium: 680_000,
    totalContracts: 1900,
    isCombo: false,
    detectedAt: ago(min(140)),
    legs: [
      {
        contractTicker: "O:NVO250221C00105000",
        strike: 105,
        expiration: day(28),
        optionType: "call",
        dte: 28,
        side: "buy",
        quantity: 1900,
        premium: 680_000,
        impliedVol: 0.48,
        delta: 0.43,
        openInterest: 9_600,
      },
    ],
    scoreBreakdown: {
      volOi: 70,
      notional: 64,
      ivAbnormality: 60,
      themeSync: 72,
      peerSync: 65,
      directionality: 72,
      novelty: 22,
    },
    context: {
      underlyingPrice: 101,
      theme: "GLP-1 / Obesity",
      peers: ["LLY", "AMGN"],
    },
  },
];

// All signals combined
const ALL = [...MOCK_SIGNALS, ...EXTRA];

function topListItem(
  signal: EnrichedSignal,
  rank: number,
  category: TopListItem["category"],
  highlightDim?: TopListItem["highlightDim"],
): TopListItem {
  return { rank, signal, label: getLabelForSignal(signal), category, highlightDim };
}

// ─── Top Calls (bullish signals, sorted by totalScore desc) ──────────────────

export const MOCK_TOP_CALLS: TopListItem[] = [
  ALL.find((s) => s.id === "sig_001")!, // NVDA 91
  ALL.find((s) => s.id === "sig_011")!, // BNTX 88 (FDA bullish)
  ALL.find((s) => s.id === "sig_006")!, // MRNA 86
  ALL.find((s) => s.id === "sig_016")!, // LLY 83
  ALL.find((s) => s.id === "sig_009")!, // AMZN 84
  ALL.find((s) => s.id === "sig_012")!, // REGN 79
  ALL.find((s) => s.id === "sig_017")!, // PLTR 77
  ALL.find((s) => s.id === "sig_004")!, // AMD 74
]
  .sort((a, b) => b.totalScore - a.totalScore)
  .map((s, i) => topListItem(s, i + 1, "calls", "directionality"));

// ─── Top Puts (bearish signals, sorted by totalScore desc) ────────────────────

export const MOCK_TOP_PUTS: TopListItem[] = [
  ALL.find((s) => s.id === "sig_013")!, // BIIB 81
  ALL.find((s) => s.id === "sig_002")!, // TSLA 78
  ALL.find((s) => s.id === "sig_015")!, // GS 75
  ALL.find((s) => s.id === "sig_007")!, // AAPL 71
  ALL.find((s) => s.id === "sig_010")!, // XBI 66
]
  .sort((a, b) => b.totalScore - a.totalScore)
  .map((s, i) => topListItem(s, i + 1, "puts", "directionality"));

// ─── IV Spikes (sorted by ivAbnormality desc) ────────────────────────────────

export const MOCK_IV_SPIKES: TopListItem[] = [
  ALL.find((s) => s.id === "sig_011")!, // BNTX ivAbn=92
  ALL.find((s) => s.id === "sig_018")!, // CRSP ivAbn=88
  ALL.find((s) => s.id === "sig_013")!, // BIIB ivAbn=85
  ALL.find((s) => s.id === "sig_006")!, // MRNA ivAbn=90
  ALL.find((s) => s.id === "sig_002")!, // TSLA ivAbn=82
  ALL.find((s) => s.id === "sig_001")!, // NVDA ivAbn=78
  ALL.find((s) => s.id === "sig_017")!, // PLTR ivAbn=70
  ALL.find((s) => s.id === "sig_010")!, // XBI ivAbn=58
]
  .sort((a, b) => (b.scoreBreakdown.ivAbnormality ?? 0) - (a.scoreBreakdown.ivAbnormality ?? 0))
  .map((s, i) => topListItem(s, i + 1, "iv_spike", "ivAbnormality"));

// ─── No-Event Alerts (novelty ≥ 55, no known catalyst) ───────────────────────

export const MOCK_NO_EVENT: TopListItem[] = [
  ALL.find((s) => s.id === "sig_010")!, // XBI novelty=72
  ALL.find((s) => s.id === "sig_004")!, // AMD novelty=70
  ALL.find((s) => s.id === "sig_002")!, // TSLA novelty=65
  ALL.find((s) => s.id === "sig_019")!, // RTX novelty=60
  ALL.find((s) => s.id === "sig_005")!, // META novelty=60
  ALL.find((s) => s.id === "sig_017")!, // PLTR novelty=55
]
  .sort((a, b) => (b.scoreBreakdown.novelty ?? 0) - (a.scoreBreakdown.novelty ?? 0))
  .map((s, i) => topListItem(s, i + 1, "no_event", "novelty"));

// ─── Biotech Catalysts (FDA/earnings plays in biotech) ───────────────────────

export const MOCK_BIOTECH_CATALYSTS: TopListItem[] = [
  ALL.find((s) => s.id === "sig_011")!, // BNTX 88 FDA
  ALL.find((s) => s.id === "sig_006")!, // MRNA 86 FDA
  ALL.find((s) => s.id === "sig_018")!, // CRSP 76 FDA
  ALL.find((s) => s.id === "sig_012")!, // REGN 79 earnings
  ALL.find((s) => s.id === "sig_013")!, // BIIB 81 bearish
  ALL.find((s) => s.id === "sig_010")!, // XBI 66 sector
]
  .sort((a, b) => b.totalScore - a.totalScore)
  .map((s, i) => topListItem(s, i + 1, "biotech", "eventProximity"));

// ─── Theme Clusters ──────────────────────────────────────────────────────────

const AI_SIGNALS = [
  ALL.find((s) => s.id === "sig_001")!,
  ALL.find((s) => s.id === "sig_004")!,
  ALL.find((s) => s.id === "sig_017")!,
];

const GLP1_SIGNALS = [
  ALL.find((s) => s.id === "sig_016")!,
  ALL.find((s) => s.id === "sig_020")!,
];

const BIOTECH_SIGNALS = [
  ALL.find((s) => s.id === "sig_006")!,
  ALL.find((s) => s.id === "sig_011")!,
  ALL.find((s) => s.id === "sig_012")!,
  ALL.find((s) => s.id === "sig_018")!,
];

const MACRO_SIGNALS = [
  ALL.find((s) => s.id === "sig_003")!,
  ALL.find((s) => s.id === "sig_008")!,
  ALL.find((s) => s.id === "sig_014")!,
];

const DEFENSE_SIGNALS = [
  ALL.find((s) => s.id === "sig_019")!,
  ALL.find((s) => s.id === "sig_017")!,
];

const EV_SIGNALS = [
  ALL.find((s) => s.id === "sig_010")!, // XBI - nearest we have; or reuse as sector hedge
];

function clusterAvgScore(sigs: EnrichedSignal[]) {
  return Math.round(sigs.reduce((acc, s) => acc + s.totalScore, 0) / sigs.length);
}

function clusterPremium(sigs: EnrichedSignal[]) {
  return sigs.reduce((acc, s) => acc + s.totalPremium, 0);
}

function clusterTopSymbols(sigs: EnrichedSignal[]) {
  return [...new Set(sigs.map((s) => s.symbol))].slice(0, 5);
}

function clusterDirection(sigs: EnrichedSignal[]): ThemeCluster["dominantDirection"] {
  const counts = { bullish: 0, bearish: 0, neutral: 0 };
  for (const s of sigs) {
    if (s.direction === "bullish" || s.direction === "bearish" || s.direction === "neutral") {
      counts[s.direction]++;
    }
  }
  const max = Math.max(counts.bullish, counts.bearish, counts.neutral);
  if (max === counts.bullish && counts.bullish > counts.bearish + counts.neutral) return "bullish";
  if (max === counts.bearish && counts.bearish > counts.bullish + counts.neutral) return "bearish";
  if (max === counts.neutral) return "neutral";
  return "mixed";
}

export const MOCK_THEME_CLUSTERS: ThemeCluster[] = [
  {
    themeId: "theme_ai",
    themeName: "AI Infrastructure",
    emoji: "🤖",
    color: "#06b6d4",
    signals: AI_SIGNALS,
    avgScore: clusterAvgScore(AI_SIGNALS),
    totalPremium: clusterPremium(AI_SIGNALS),
    signalCount: AI_SIGNALS.length,
    dominantDirection: clusterDirection(AI_SIGNALS),
    topSymbols: clusterTopSymbols(AI_SIGNALS),
    labels: AI_SIGNALS.map(getLabelForSignal),
  },
  {
    themeId: "theme_glp1",
    themeName: "GLP-1 / Obesity",
    emoji: "💊",
    color: "#a855f7",
    signals: GLP1_SIGNALS,
    avgScore: clusterAvgScore(GLP1_SIGNALS),
    totalPremium: clusterPremium(GLP1_SIGNALS),
    signalCount: GLP1_SIGNALS.length,
    dominantDirection: clusterDirection(GLP1_SIGNALS),
    topSymbols: clusterTopSymbols(GLP1_SIGNALS),
    labels: GLP1_SIGNALS.map(getLabelForSignal),
  },
  {
    themeId: "theme_bio",
    themeName: "Biotech / Genomics",
    emoji: "🧬",
    color: "#f59e0b",
    signals: BIOTECH_SIGNALS,
    avgScore: clusterAvgScore(BIOTECH_SIGNALS),
    totalPremium: clusterPremium(BIOTECH_SIGNALS),
    signalCount: BIOTECH_SIGNALS.length,
    dominantDirection: clusterDirection(BIOTECH_SIGNALS),
    topSymbols: clusterTopSymbols(BIOTECH_SIGNALS),
    labels: BIOTECH_SIGNALS.map(getLabelForSignal),
  },
  {
    themeId: "theme_macro",
    themeName: "Macro / Rates",
    emoji: "🏦",
    color: "#ef4444",
    signals: MACRO_SIGNALS,
    avgScore: clusterAvgScore(MACRO_SIGNALS),
    totalPremium: clusterPremium(MACRO_SIGNALS),
    signalCount: MACRO_SIGNALS.length,
    dominantDirection: clusterDirection(MACRO_SIGNALS),
    topSymbols: clusterTopSymbols(MACRO_SIGNALS),
    labels: MACRO_SIGNALS.map(getLabelForSignal),
  },
  {
    themeId: "theme_defense",
    themeName: "Defense & Cyber",
    emoji: "🛡️",
    color: "#7c3aed",
    signals: DEFENSE_SIGNALS,
    avgScore: clusterAvgScore(DEFENSE_SIGNALS),
    totalPremium: clusterPremium(DEFENSE_SIGNALS),
    signalCount: DEFENSE_SIGNALS.length,
    dominantDirection: clusterDirection(DEFENSE_SIGNALS),
    topSymbols: clusterTopSymbols(DEFENSE_SIGNALS),
    labels: DEFENSE_SIGNALS.map(getLabelForSignal),
  },
  {
    themeId: "theme_bio_bear",
    themeName: "Biotech Hedges",
    emoji: "🔬",
    color: "#f43f5e",
    signals: EV_SIGNALS,
    avgScore: clusterAvgScore(EV_SIGNALS),
    totalPremium: clusterPremium(EV_SIGNALS),
    signalCount: EV_SIGNALS.length,
    dominantDirection: clusterDirection(EV_SIGNALS),
    topSymbols: clusterTopSymbols(EV_SIGNALS),
    labels: EV_SIGNALS.map(getLabelForSignal),
  },
];

// ─── Factor Clusters ──────────────────────────────────────────────────────────

const MOMENTUM_SIGS = [
  ALL.find((s) => s.id === "sig_001")!, // NVDA
  ALL.find((s) => s.id === "sig_009")!, // AMZN
  ALL.find((s) => s.id === "sig_016")!, // LLY
];

const VOLATILITY_SIGS = [
  ALL.find((s) => s.id === "sig_006")!, // MRNA
  ALL.find((s) => s.id === "sig_011")!, // BNTX
  ALL.find((s) => s.id === "sig_003")!, // SPY straddle
];

const GROWTH_SIGS = [
  ALL.find((s) => s.id === "sig_004")!, // AMD
  ALL.find((s) => s.id === "sig_017")!, // PLTR
  ALL.find((s) => s.id === "sig_005")!, // META
];

const MACRO_FACTOR_SIGS = [
  ALL.find((s) => s.id === "sig_003")!, // SPY
  ALL.find((s) => s.id === "sig_008")!, // QQQ
  ALL.find((s) => s.id === "sig_014")!, // IWM
];

const HEDGE_SIGS = [
  ALL.find((s) => s.id === "sig_002")!, // TSLA bear
  ALL.find((s) => s.id === "sig_015")!, // GS bear
  ALL.find((s) => s.id === "sig_013")!, // BIIB bear
];

function factorDirection(sigs: EnrichedSignal[]): FactorCluster["dominantDirection"] {
  return clusterDirection(sigs) as FactorCluster["dominantDirection"];
}

export const MOCK_FACTOR_CLUSTERS: FactorCluster[] = [
  {
    factorId: "factor_momentum",
    factorName: "Momentum",
    emoji: "🚀",
    color: "#f97316",
    description: "High-beta names with accelerating revenue growth and price momentum",
    signals: MOMENTUM_SIGS,
    avgScore: clusterAvgScore(MOMENTUM_SIGS),
    totalPremium: clusterPremium(MOMENTUM_SIGS),
    signalCount: MOMENTUM_SIGS.length,
    dominantDirection: factorDirection(MOMENTUM_SIGS),
    topSymbols: clusterTopSymbols(MOMENTUM_SIGS),
  },
  {
    factorId: "factor_volatility",
    factorName: "Volatility",
    emoji: "⚡",
    color: "#eab308",
    description: "High implied volatility / event-driven plays with outsized premium",
    signals: VOLATILITY_SIGS,
    avgScore: clusterAvgScore(VOLATILITY_SIGS),
    totalPremium: clusterPremium(VOLATILITY_SIGS),
    signalCount: VOLATILITY_SIGS.length,
    dominantDirection: factorDirection(VOLATILITY_SIGS),
    topSymbols: clusterTopSymbols(VOLATILITY_SIGS),
  },
  {
    factorId: "factor_growth",
    factorName: "Growth",
    emoji: "📈",
    color: "#22c55e",
    description: "AI-era growth plays with expanding TAM and multi-year revenue visibility",
    signals: GROWTH_SIGS,
    avgScore: clusterAvgScore(GROWTH_SIGS),
    totalPremium: clusterPremium(GROWTH_SIGS),
    signalCount: GROWTH_SIGS.length,
    dominantDirection: factorDirection(GROWTH_SIGS),
    topSymbols: clusterTopSymbols(GROWTH_SIGS),
  },
  {
    factorId: "factor_macro",
    factorName: "Macro",
    emoji: "🌐",
    color: "#6366f1",
    description: "Index-level or rates-sensitive positioning ahead of Fed, CPI, or NFP",
    signals: MACRO_FACTOR_SIGS,
    avgScore: clusterAvgScore(MACRO_FACTOR_SIGS),
    totalPremium: clusterPremium(MACRO_FACTOR_SIGS),
    signalCount: MACRO_FACTOR_SIGS.length,
    dominantDirection: factorDirection(MACRO_FACTOR_SIGS),
    topSymbols: clusterTopSymbols(MACRO_FACTOR_SIGS),
  },
  {
    factorId: "factor_hedge",
    factorName: "Defensive / Hedge",
    emoji: "🛡️",
    color: "#f43f5e",
    description: "Protective put buying or bearish positioning across sectors",
    signals: HEDGE_SIGS,
    avgScore: clusterAvgScore(HEDGE_SIGS),
    totalPremium: clusterPremium(HEDGE_SIGS),
    signalCount: HEDGE_SIGS.length,
    dominantDirection: factorDirection(HEDGE_SIGS),
    topSymbols: clusterTopSymbols(HEDGE_SIGS),
  },
];
