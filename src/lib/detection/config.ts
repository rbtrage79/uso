/**
 * Detection Engine Configuration
 *
 * All signal detection thresholds in one place.
 * Override via environment variables where noted.
 */

export const DETECTION_CONFIG = {
  // ─── Global DTE gate ────────────────────────────────────────────────────────
  /** Maximum days-to-expiration to consider */
  maxDte: parseInt(process.env.MAX_DTE ?? "90"),

  // ─── Noise filters (before any scoring) ────────────────────────────────────
  /** Minimum contracts in a single trade/sweep */
  minContracts: parseInt(process.env.MIN_SIGNAL_CONTRACTS ?? "100"),
  /** Minimum total premium (dollars) for a signal */
  minPremium: parseFloat(process.env.MIN_SIGNAL_NOTIONAL ?? "50000"),
  /** Minimum option price (avoid penny options) */
  minOptionPrice: 0.05,

  // ─── Dedup window ───────────────────────────────────────────────────────────
  /** How long (ms) to suppress repeated signals for same contract */
  dedupWindowMs: 5 * 60 * 1000, // 5 min
  /** Key: same contract + same side within window → deduplicate */

  // ─── Combo detection window ─────────────────────────────────────────────────
  /** Time window to cluster trades into a combo (ms) */
  comboWindowMs: 2000, // 2 seconds

  // ─── Vol/OI ratio (Detector A & B) ─────────────────────────────────────────
  /** Vol/OI ratio considered "notable" */
  volOiRatioNoteworthy: 0.5,
  /** Vol/OI ratio considered "unusual" */
  volOiRatioUnusual: 1.0,
  /** Vol/OI ratio considered "extreme" */
  volOiRatioExtreme: 2.5,

  // ─── Historical baseline lookback ───────────────────────────────────────────
  /** Days of historical volume to use as baseline */
  historicalDays: 20,
  /** Z-score threshold for "unusual" vs historical */
  historicalZScoreThreshold: 2.0,
  /** Robust Z-score threshold (MAD-based) */
  robustZScoreThreshold: 3.0,

  // ─── Notional thresholds (Detector C) ───────────────────────────────────────
  notionalTiers: {
    large: 250_000,   // $250K — noteworthy
    huge: 1_000_000,  // $1M — unusual
    whale: 5_000_000, // $5M — extreme
  },

  // ─── Time-of-day (Detector D) ────────────────────────────────────────────────
  /** Minutes from market open/close that are "high activity" windows */
  openingMinutes: 30,  // 9:30–10:00
  closingMinutes: 30,  // 15:30–16:00
  /** Z-score vs intraday bucket baseline */
  intradayBucketMinutes: 30,
  intradayZThreshold: 2.5,

  // ─── OI change velocity (Detector E) ────────────────────────────────────────
  /** Minimum % OI change (day-over-day) to flag */
  oiChangePct: 0.20, // 20%
  oiChangeAbsolute: 5000, // 5,000 contracts

  // ─── IV abnormality (Detector G) ────────────────────────────────────────────
  /** IV rank above which to flag */
  ivRankHighThreshold: 70,
  /** IV rank below which to flag (vol-selling/compression) */
  ivRankLowThreshold: 20,
  /** IV vs realized vol ratio for vol-buying proxy */
  ivRvRatioHigh: 1.5,

  // ─── Event proximity (Detectors H, I, J) ────────────────────────────────────
  /** Days-to-event windows */
  earningsWindows: [3, 7, 14, 21], // flag if expiration is within N days of earnings
  fdaWindows: [7, 14, 30],
  macroWindows: [1, 3, 7],
  /** Score multipliers for pre-event flags */
  preEventMultiplier: 1.4,

  // ─── Peer sync (Detector F & N) ─────────────────────────────────────────────
  /** Minimum peers also showing unusual flow */
  minPeersForSync: 3,
  /** Time window for peer-sync detection */
  peerSyncWindowMs: 30 * 60 * 1000, // 30 min

  // ─── Sweep / aggressor (Detector K & sweep-imbalance) ────────────────────────
  /** Trade price vs midpoint: fraction above mid → buy aggressor */
  sweepBuyThreshold: 0.6,  // price > mid + 60% of spread
  sweepSellThreshold: 0.4, // price < mid - 40% of spread
  /** Multiple sweep legs: min count to call it a sweep */
  sweepMinLegs: 2,
  sweepWindowMs: 500, // 500ms clustering window

  // ─── Same-strike accumulation (Detector: repeat accumulation) ────────────────
  /** Count of separate trades at same strike/expiry within window to flag */
  repeatAccumMinCount: 3,
  repeatAccumWindowMs: 10 * 60 * 1000, // 10 min
  repeatAccumMinTotalContracts: 300,

  // ─── Large opening flow proxy ─────────────────────────────────────────────────
  /** A trade is likely "opening" when size > X% of total OI */
  openingFlowOiPct: 0.10, // 10% of OI

  // ─── Scoring thresholds ───────────────────────────────────────────────────────
  /** Min composite score to store signal (noise filter) */
  minScoreToStore: 40,
  /** Min composite score to publish to feed */
  minScoreToPublish: parseInt(process.env.MIN_PUBLISH_SCORE ?? "55"),

  // ─── Scoring weights (must sum to 1.0) ───────────────────────────────────────
  scoringWeights: {
    volOi: 0.14,
    notional: 0.12,
    timeOfDay: 0.05,
    ivAbnormality: 0.09,
    oiVelocity: 0.07,
    eventProximity: 0.13,
    peerSync: 0.07,
    directionality: 0.10,
    combo: 0.08,
    themeSync: 0.07,
    novelty: 0.08,
  },
} as const;

export type DetectionConfig = typeof DETECTION_CONFIG;
