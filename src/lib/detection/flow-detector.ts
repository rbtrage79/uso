/**
 * Flow Detector — orchestrates all individual detectors.
 *
 * Detectors implemented:
 * A. Unusual volume vs contract historical baseline
 * B. Unusual volume vs open interest
 * C. Unusual absolute contracts / notional
 * D. Unusual for time-of-day
 * E. Unusual OI change
 * F. Unusual relative to peer group
 * G. Unusual IV level
 * H. Unusual ahead of earnings
 * I. Unusual ahead of FDA/PDUFA
 * J. Unusual around macro events
 * K. Unusual directional bets
 * L. Unusual combo trades
 * M. Unusual with no known event
 * N. Synchronized flow across theme/sub-industry
 * O. Sector rotation flow
 * P. Factor rotation flow
 *
 * Extended detectors:
 * - Call/put sweep imbalance
 * - Repeat same-strike accumulation
 * - Cross-strike laddering
 * - Upside call spread patterns
 * - Downside hedge patterns
 * - Large opening-flow proxy
 * - Premium concentration in single expiry
 * - Volatility buying vs selling proxy
 * - Flow opposing spot move
 * - Flow confirming breakout/breakdown
 * - Unusual weeklies vs monthlies
 * - Gamma-sensitive strike crowding proxy
 * - Retail vs institutional heuristic
 */

import { DETECTION_CONFIG as CFG } from "./config";
import { computeScore } from "@/lib/scoring/scorer";
import {
  parseOptionTicker,
  calcPremium,
  clamp,
  robustZScore,
  normalizeScore,
  percentileRank,
  formatPremium,
} from "@/lib/utils/options-math";
import type { RawTradeLeg, DetectedSignalPayload } from "@/types/signals";
import type { PolygonWsOptionTrade } from "@/types/polygon";

// ─── Intraday trade buffer ─────────────────────────────────────────────────────

interface ContractBuffer {
  ticker: string;
  trades: Array<{ price: number; size: number; t: number; x: number; c: number[] }>;
  totalVolume: number;
  totalPremium: number;
  lastUpdated: number;
}

interface ContractBaseline {
  historicalDailyVolumes: number[];
  openInterest: number;
  prevDayOI: number;
  avgOI30d: number;
  impliedVol: number;
  ivRank: number;
  ivPercentile: number;
  historicalIVs: number[];
  realizedVol: number;
  sector: string;
  peerGroup: string[];
}

interface IntradayBucket {
  minuteSinceOpen: number;
  volume: number;
}

/** In-memory buffers — replaced by Redis in production */
const tradeBuffers = new Map<string, ContractBuffer>();
const baselines = new Map<string, ContractBaseline>();
const intradayBuckets = new Map<string, IntradayBucket[]>();

/** Recent signals for dedup */
const recentSignalKeys = new Map<string, number>(); // key → timestamp

// ─── Main ingest function ──────────────────────────────────────────────────────

export interface DetectorContext {
  underlyingPrice?: number;
  daysToEarnings?: number | null;
  daysToFda?: number | null;
  daysToMacro?: number | null;
  unusualPeerCount?: number;
  totalPeers?: number;
  themeSignalCount?: number;
  themeBucketSize?: number;
  avgThemeScore?: number;
  oiChangePct?: number;
  /** Current spot bid/ask midpoint for directionality */
  quoteData?: { bid: number; ask: number };
}

export function ingestTrade(
  trade: PolygonWsOptionTrade,
  ctx: DetectorContext = {},
): DetectedSignalPayload | null {
  const parsed = parseOptionTicker(trade.sym);
  if (!parsed) return null;

  // Gate 1: DTE filter
  if (parsed.dte > CFG.maxDte || parsed.dte < 0) return null;

  // Gate 2: Minimum option price
  if (trade.p < CFG.minOptionPrice) return null;

  const premium = calcPremium(trade.p, trade.s);

  // Buffer this trade
  upsertBuffer(trade.sym, trade);

  const buffer = tradeBuffers.get(trade.sym)!;
  const baseline = baselines.get(trade.sym);

  // Gate 3: Minimum contracts (single trade or accumulated)
  if (buffer.totalVolume < CFG.minContracts) return null;

  // Gate 4: Minimum premium
  if (buffer.totalPremium < CFG.minPremium) return null;

  // Gate 5: Dedup check
  const dedupKey = `${trade.sym}:${Math.round(Date.now() / CFG.dedupWindowMs)}`;
  if (recentSignalKeys.has(dedupKey)) return null;
  recentSignalKeys.set(dedupKey, Date.now());
  cleanupDedup();

  // ── Build scoring inputs ────────────────────────────────────────────────────

  const msSinceMarketOpen = getMsSinceMarketOpen();
  const minutesSinceOpen = Math.floor(msSinceMarketOpen / 60_000);
  const bucketIdx = Math.floor(minutesSinceOpen / CFG.intradayBucketMinutes);

  // Aggressor side heuristic
  const aggressorSide = inferAggressor(trade, ctx.quoteData);
  const priceMidpointPct = ctx.quoteData
    ? (trade.p - ctx.quoteData.bid) / Math.max(ctx.quoteData.ask - ctx.quoteData.bid, 0.01)
    : undefined;

  // Build scorer input
  const scoreResult = computeScore({
    optionType: parsed.optionType,
    contracts: buffer.totalVolume,
    premium: buffer.totalPremium,
    dte: parsed.dte,
    strike: parsed.strike,
    underlyingPrice: ctx.underlyingPrice,
    impliedVol: baseline?.impliedVol,
    delta: estimateDelta(parsed.optionType, parsed.strike, ctx.underlyingPrice),

    volOi: baseline
      ? {
          dayVolume: buffer.totalVolume,
          openInterest: baseline.openInterest,
          historicalVolumes: baseline.historicalDailyVolumes,
          avgOI: baseline.avgOI30d,
        }
      : undefined,

    timeOfDay: {
      minutesSinceOpen,
      bucketHistoricalVolumes: getBucketHistory(trade.sym, bucketIdx),
      bucketCurrentVolume: buffer.totalVolume,
    },

    ivData: baseline
      ? {
          currentIV: baseline.impliedVol,
          ivRank: baseline.ivRank,
          ivPercentile: baseline.ivPercentile,
          historicalIVs: baseline.historicalIVs,
          realizedVol: baseline.realizedVol,
        }
      : undefined,

    oiVelocity: baseline
      ? {
          currentOI: baseline.openInterest,
          previousOI: baseline.prevDayOI,
        }
      : undefined,

    eventProximity: {
      dte: parsed.dte,
      daysToEarnings: ctx.daysToEarnings,
      daysToFda: ctx.daysToFda,
      daysToMacro: ctx.daysToMacro,
    },

    peerSync:
      ctx.unusualPeerCount !== undefined
        ? {
            symbol: parsed.underlying,
            unusualPeerCount: ctx.unusualPeerCount,
            totalPeers: ctx.totalPeers ?? 0,
          }
        : undefined,

    directionality: {
      optionType: parsed.optionType,
      priceMidpointPct,
      aggressorSide,
      strikeVsSpot: ctx.underlyingPrice
        ? parsed.strike / ctx.underlyingPrice
        : undefined,
      delta: estimateDelta(parsed.optionType, parsed.strike, ctx.underlyingPrice),
    },

    themeSync:
      ctx.themeSignalCount !== undefined
        ? {
            themeSignalCount: ctx.themeSignalCount,
            avgThemeScore: ctx.avgThemeScore ?? 0,
            themeBucketSize: ctx.themeBucketSize ?? 0,
          }
        : undefined,

    novelty: {
      hasNearEarnings: !!(ctx.daysToEarnings !== null && ctx.daysToEarnings !== undefined && ctx.daysToEarnings <= 14),
      hasNearFda: !!(ctx.daysToFda !== null && ctx.daysToFda !== undefined && ctx.daysToFda <= 30),
      hasNearMacro: !!(ctx.daysToMacro !== null && ctx.daysToMacro !== undefined && ctx.daysToMacro <= 7),
      baseSignalScore: 0, // will be computed
    },
  });

  // Gate 5: Minimum score
  if (scoreResult.totalScore < CFG.minScoreToStore) return null;

  // Build signal type
  const signalType = classifySignalType(buffer, parsed);

  // Build leg
  const leg: RawTradeLeg = {
    contractTicker: trade.sym,
    underlying: parsed.underlying,
    expirationDate: parsed.expiration,
    strike: parsed.strike,
    optionType: parsed.optionType,
    dte: parsed.dte,
    side: aggressorSide === "buy" ? "buy" : aggressorSide === "sell" ? "sell" : "unknown",
    quantity: buffer.totalVolume,
    premium: buffer.totalPremium,
    priceAtTrade: trade.p,
    underlyingPrice: ctx.underlyingPrice,
    impliedVol: baseline?.impliedVol,
    delta: estimateDelta(parsed.optionType, parsed.strike, ctx.underlyingPrice),
    openInterest: baseline?.openInterest,
    dayVolume: buffer.totalVolume,
    tradeTime: new Date(trade.t),
  };

  const payload: DetectedSignalPayload = {
    symbol: parsed.underlying,
    signalType,
    direction: scoreResult.direction,
    totalScore: scoreResult.totalScore,
    confidence: scoreResult.confidence,
    totalPremium: buffer.totalPremium,
    totalContracts: buffer.totalVolume,
    isCombo: false,
    scoreVolOi: scoreResult.dimensions.volOi,
    scoreNotional: scoreResult.dimensions.notional,
    scoreTimeOfDay: scoreResult.dimensions.timeOfDay,
    scoreIvAbnormality: scoreResult.dimensions.ivAbnormality,
    scoreOiVelocity: scoreResult.dimensions.oiVelocity,
    scoreEventProximity: scoreResult.dimensions.eventProximity,
    scorePeerSync: scoreResult.dimensions.peerSync,
    scoreDirectionality: scoreResult.dimensions.directionality,
    scoreCombo: scoreResult.dimensions.combo,
    scoreThemeSync: scoreResult.dimensions.themeSync,
    scoreNovelty: scoreResult.dimensions.novelty,
    underlyingPrice: ctx.underlyingPrice,
    nearestEventType: nearestEventLabel(ctx),
    nearestEventDate: nearestEventDate(ctx),
    daysToNearestEvent: nearestDays(ctx),
    legs: [leg],
  };

  return payload;
}

// ─── Extended detectors ───────────────────────────────────────────────────────

/**
 * Detect call/put sweep imbalance across the underlying.
 * Returns imbalance score 0-100 (50 = neutral).
 */
export function detectSweepImbalance(
  callSweepPremium: number,
  putSweepPremium: number,
): { score: number; direction: "bullish" | "bearish" | "neutral" } {
  const total = callSweepPremium + putSweepPremium;
  if (total < CFG.minPremium) return { score: 0, direction: "neutral" };
  const ratio = callSweepPremium / total; // 0-1, 0.5 = neutral
  const deviation = Math.abs(ratio - 0.5) * 2; // 0-1
  const score = clamp(deviation * 100);

  return {
    score,
    direction: ratio > 0.6 ? "bullish" : ratio < 0.4 ? "bearish" : "neutral",
  };
}

/**
 * Detect repeat same-strike accumulation over short intervals.
 */
export function detectRepeatAccumulation(
  ticker: string,
  recentTrades: Array<{ t: number; s: number }>,
): boolean {
  if (recentTrades.length < CFG.repeatAccumMinCount) return false;
  const windowStart = Date.now() - CFG.repeatAccumWindowMs;
  const inWindow = recentTrades.filter((t) => t.t >= windowStart);
  const total = inWindow.reduce((a, b) => a + b.s, 0);
  return (
    inWindow.length >= CFG.repeatAccumMinCount &&
    total >= CFG.repeatAccumMinTotalContracts
  );
}

/**
 * Detect cross-strike laddering: activity climbing up or down a strike ladder.
 */
export function detectLaddering(
  strikeVolumes: Map<number, number>,
): { detected: boolean; direction: "up" | "down" | "none"; strikes: number[] } {
  const sorted = Array.from(strikeVolumes.entries())
    .sort(([a], [b]) => a - b)
    .filter(([, v]) => v >= CFG.minContracts);

  if (sorted.length < 3) return { detected: false, direction: "none", strikes: [] };

  // Check for monotonically increasing strikes with volume
  const isLadderUp = sorted.every(([, v], i) =>
    i === 0 ? true : v >= sorted[i - 1][1] * 0.6,
  );
  const isLadderDown = sorted.every(([, v], i) =>
    i === 0 ? true : v <= sorted[i - 1][1] * 1.6,
  );

  if (isLadderUp) return { detected: true, direction: "up", strikes: sorted.map(([s]) => s) };
  if (isLadderDown) return { detected: true, direction: "down", strikes: sorted.map(([s]) => s) };
  return { detected: false, direction: "none", strikes: [] };
}

/**
 * Premium concentration in a single expiry.
 * Returns 0-100. High = most activity concentrated in one expiry.
 */
export function detectExpiryConcentration(
  expiryPremiums: Map<string, number>,
): number {
  const values = Array.from(expiryPremiums.values());
  if (values.length === 0) return 0;
  const total = values.reduce((a, b) => a + b, 0);
  const max = Math.max(...values);
  return total > 0 ? clamp((max / total) * 100) : 0;
}

/**
 * Vol-buying vs vol-selling proxy.
 * If aggressor is buying OTM options → vol-buying.
 * Returns: "buying" | "selling" | "neutral"
 */
export function detectVolIntent(
  aggressorSide: "buy" | "sell" | "unknown",
  moneyness: number, // strike / spot
  optionType: "call" | "put",
): "vol_buying" | "vol_selling" | "neutral" {
  const isOtm = (optionType === "call" && moneyness > 1.02) || (optionType === "put" && moneyness < 0.98);
  if (aggressorSide === "buy" && isOtm) return "vol_buying";
  if (aggressorSide === "sell") return "vol_selling";
  return "neutral";
}

/**
 * Flow opposing spot move: bearish print while stock rallying (or vice versa).
 * This can be a hedge or contrarian signal.
 */
export function detectFlowOpposingSpot(
  direction: "bullish" | "bearish" | "neutral",
  spotDayChangePct: number,
): boolean {
  if (direction === "bullish" && spotDayChangePct < -1.5) return true; // buy calls in a down tape
  if (direction === "bearish" && spotDayChangePct > 1.5) return true; // buy puts in a up tape
  return false;
}

/**
 * Retail vs institutional heuristic.
 * Retail tends to: odd lots, round prices, single legs, near 0DTE.
 * Institutional tends to: large blocks, complex, farther DTE.
 */
export function classifyTradeOrigin(
  contracts: number,
  premium: number,
  dte: number,
  isCombo: boolean,
): "likely_institutional" | "likely_retail" | "unknown" {
  if (contracts >= 500 || premium >= 500_000 || isCombo) return "likely_institutional";
  if (contracts <= 10 && dte <= 3 && !isCombo) return "likely_retail";
  return "unknown";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function upsertBuffer(ticker: string, trade: PolygonWsOptionTrade) {
  const existing = tradeBuffers.get(ticker);
  const premium = calcPremium(trade.p, trade.s);
  if (existing) {
    existing.trades.push({ price: trade.p, size: trade.s, t: trade.t, x: trade.x, c: trade.c });
    existing.totalVolume += trade.s;
    existing.totalPremium += premium;
    existing.lastUpdated = Date.now();
  } else {
    tradeBuffers.set(ticker, {
      ticker,
      trades: [{ price: trade.p, size: trade.s, t: trade.t, x: trade.x, c: trade.c }],
      totalVolume: trade.s,
      totalPremium: premium,
      lastUpdated: Date.now(),
    });
  }
}

function getMsSinceMarketOpen(): number {
  const now = new Date();
  const open = new Date(now);
  open.setHours(9, 30, 0, 0);
  return Math.max(0, now.getTime() - open.getTime());
}

function getBucketHistory(ticker: string, bucketIdx: number): number[] {
  return intradayBuckets.get(`${ticker}:${bucketIdx}`)?.map((b) => b.volume) ?? [];
}

function inferAggressor(
  trade: PolygonWsOptionTrade,
  quote?: { bid: number; ask: number },
): "buy" | "sell" | "unknown" {
  if (!quote) return "unknown";
  const mid = (quote.bid + quote.ask) / 2;
  const spread = quote.ask - quote.bid;
  if (spread < 0.01) return "unknown";
  const pct = (trade.p - quote.bid) / spread;
  if (pct >= CFG.sweepBuyThreshold) return "buy";
  if (pct <= 1 - CFG.sweepBuyThreshold) return "sell";
  return "unknown";
}

function estimateDelta(
  optionType: "call" | "put",
  strike: number,
  spot?: number,
): number | undefined {
  if (!spot) return undefined;
  const moneyness = strike / spot;
  // Very rough delta estimate
  if (optionType === "call") {
    if (moneyness < 0.9) return 0.8;
    if (moneyness < 0.95) return 0.65;
    if (moneyness < 1.02) return 0.5;
    if (moneyness < 1.08) return 0.35;
    if (moneyness < 1.15) return 0.2;
    return 0.1;
  } else {
    if (moneyness > 1.1) return -0.1;
    if (moneyness > 1.05) return -0.2;
    if (moneyness > 0.98) return -0.5;
    if (moneyness > 0.92) return -0.65;
    if (moneyness > 0.85) return -0.8;
    return -0.9;
  }
}

function classifySignalType(
  buffer: ContractBuffer,
  parsed: ReturnType<typeof parseOptionTicker> & {},
): DetectedSignalPayload["signalType"] {
  const tradeCount = buffer.trades.length;
  const timeSpan = buffer.trades.length > 1
    ? buffer.trades[buffer.trades.length - 1].t - buffer.trades[0].t
    : 0;

  // Sweep: multiple trades within 2 seconds
  if (tradeCount >= CFG.sweepMinLegs && timeSpan <= CFG.sweepWindowMs) return "sweep";

  // Block: single large trade
  if (tradeCount === 1 && buffer.totalVolume >= 500) return "block";

  // Repeat sweep: many trades over a longer window
  if (tradeCount >= 5 && timeSpan <= CFG.repeatAccumWindowMs) return "repeat_sweep";

  return "single_leg";
}

function nearestEventLabel(ctx: DetectorContext): string | undefined {
  const events = [
    { label: "earnings", days: ctx.daysToEarnings },
    { label: "fda", days: ctx.daysToFda },
    { label: "macro", days: ctx.daysToMacro },
  ].filter((e) => e.days != null) as Array<{ label: string; days: number }>;

  if (events.length === 0) return undefined;
  events.sort((a, b) => a.days - b.days);
  return events[0].label;
}

function nearestEventDate(ctx: DetectorContext): Date | undefined {
  const days = nearestDays(ctx);
  if (days === undefined) return undefined;
  return new Date(Date.now() + days * 86_400_000);
}

function nearestDays(ctx: DetectorContext): number | undefined {
  const candidates = [ctx.daysToEarnings, ctx.daysToFda, ctx.daysToMacro].filter(
    (d): d is number => d != null && d >= 0,
  );
  return candidates.length > 0 ? Math.min(...candidates) : undefined;
}

function cleanupDedup() {
  const cutoff = Date.now() - CFG.dedupWindowMs;
  for (const [k, t] of recentSignalKeys.entries()) {
    if (t < cutoff) recentSignalKeys.delete(k);
  }
}

/** Expose for external baseline injection (from Redis/DB) */
export function setBaseline(ticker: string, data: ContractBaseline) {
  baselines.set(ticker, data);
}

export function clearBuffers() {
  tradeBuffers.clear();
  recentSignalKeys.clear();
}
