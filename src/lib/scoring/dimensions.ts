/**
 * Individual scoring dimension functions.
 * Each returns a value 0-100.
 *
 * Designed to be composable — feed them what you have,
 * they fall back gracefully when data is missing.
 */

import {
  zScore,
  percentileRank,
  robustZScore,
  normalizeScore,
  clamp,
  median,
} from "@/lib/utils/options-math";
import { DETECTION_CONFIG } from "@/lib/detection/config";

const CFG = DETECTION_CONFIG;

// ─── A/B. Volume vs OI and vs historical baseline ────────────────────────────

export interface VolOiInput {
  /** Today's volume for this contract so far */
  dayVolume: number;
  /** Current open interest */
  openInterest: number;
  /** Historical daily volume for this contract (last N days) */
  historicalVolumes: number[];
  /** Optional: 30-day avg OI for the contract */
  avgOI?: number;
}

export function scoreVolOi(input: VolOiInput): number {
  const scores: number[] = [];

  // A. Vol / OI ratio
  if (input.openInterest > 0) {
    const ratio = input.dayVolume / input.openInterest;
    const normalized =
      ratio >= CFG.volOiRatioExtreme ? 100
      : ratio >= CFG.volOiRatioUnusual ? 75 + (ratio / CFG.volOiRatioExtreme) * 25
      : ratio >= CFG.volOiRatioNoteworthy ? 40 + (ratio / CFG.volOiRatioUnusual) * 35
      : (ratio / CFG.volOiRatioNoteworthy) * 40;
    scores.push(clamp(normalized));
  }

  // B. Vol vs historical baseline (robust z-score)
  if (input.historicalVolumes.length >= 5) {
    const rz = robustZScore(input.dayVolume, input.historicalVolumes);
    scores.push(normalizeScore(rz, 2.5));
  }

  // Avg vs OI trend
  if (input.avgOI && input.openInterest > 0) {
    const oiGrowth = (input.openInterest - input.avgOI) / Math.max(input.avgOI, 1);
    scores.push(clamp(normalizeScore(oiGrowth * 3, 1)));
  }

  return scores.length > 0 ? clamp(Math.max(...scores)) : 0;
}

// ─── C. Absolute notional ─────────────────────────────────────────────────────

export function scoreNotional(premiumDollars: number): number {
  const { large, huge, whale } = CFG.notionalTiers;
  if (premiumDollars >= whale) return 100;
  if (premiumDollars >= huge) return 75 + ((premiumDollars - huge) / (whale - huge)) * 25;
  if (premiumDollars >= large) return 50 + ((premiumDollars - large) / (huge - large)) * 25;
  if (premiumDollars >= CFG.minPremium) return 20 + ((premiumDollars - CFG.minPremium) / (large - CFG.minPremium)) * 30;
  return 0;
}

// ─── D. Time-of-day abnormality ───────────────────────────────────────────────

export interface TimeOfDayInput {
  /** Hours + minutes into market session (0 = 9:30 EST open) */
  minutesSinceOpen: number;
  /** Historical volume totals for this intraday 30-min bucket */
  bucketHistoricalVolumes: number[];
  /** Current bucket volume */
  bucketCurrentVolume: number;
}

export function scoreTimeOfDay(input: TimeOfDayInput): number {
  const min = input.minutesSinceOpen;
  const sessionLen = 390; // 6.5 hours

  // Opening / closing windows are expected to be busy → lower score boost
  const isOpeningWindow = min < CFG.openingMinutes;
  const isClosingWindow = min > sessionLen - CFG.closingMinutes;

  let base = 50;

  // Trade in quiet mid-day periods is more suspicious
  if (!isOpeningWindow && !isClosingWindow) {
    base = 65;
  }

  // Z-score vs same 30-min bucket historically
  if (input.bucketHistoricalVolumes.length >= 5) {
    const z = robustZScore(input.bucketCurrentVolume, input.bucketHistoricalVolumes);
    const histScore = normalizeScore(z, 2.5);
    return clamp(Math.round((base + histScore) / 2));
  }

  return clamp(base);
}

// ─── G. IV abnormality ────────────────────────────────────────────────────────

export interface IvAbnormalityInput {
  /** Current contract IV */
  currentIV: number;
  /** IV rank 0-100 (current IV vs 52-week range) */
  ivRank?: number;
  /** IV percentile 0-100 (vs 252-day population) */
  ivPercentile?: number;
  /** Historical IVs for this contract */
  historicalIVs?: number[];
  /** Current realized/historical volatility of the underlying */
  realizedVol?: number;
}

export function scoreIvAbnormality(input: IvAbnormalityInput): number {
  const scores: number[] = [];

  if (input.ivRank !== undefined) {
    // High IV rank → buying vol is expensive → more noteworthy
    if (input.ivRank >= CFG.ivRankHighThreshold) {
      scores.push(40 + ((input.ivRank - CFG.ivRankHighThreshold) / (100 - CFG.ivRankHighThreshold)) * 60);
    } else if (input.ivRank <= CFG.ivRankLowThreshold) {
      // Buying cheap vol → interesting contrarian
      scores.push(30 + ((CFG.ivRankLowThreshold - input.ivRank) / CFG.ivRankLowThreshold) * 35);
    }
  }

  if (input.ivPercentile !== undefined) {
    scores.push(clamp(input.ivPercentile));
  }

  if (input.historicalIVs && input.historicalIVs.length >= 10) {
    const z = robustZScore(input.currentIV, input.historicalIVs);
    scores.push(normalizeScore(Math.abs(z), 2.5));
  }

  // IV/RV ratio: high IV premium → vol being bid up
  if (input.realizedVol && input.realizedVol > 0) {
    const ratio = input.currentIV / input.realizedVol;
    if (ratio >= CFG.ivRvRatioHigh) {
      scores.push(clamp(30 + (ratio - CFG.ivRvRatioHigh) * 20));
    }
  }

  return scores.length > 0 ? clamp(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)) : 0;
}

// ─── E. OI change velocity ────────────────────────────────────────────────────

export interface OiVelocityInput {
  currentOI: number;
  previousOI: number;
  /** OI history for robust baseline */
  oiHistory?: number[];
}

export function scoreOiVelocity(input: OiVelocityInput): number {
  const { currentOI, previousOI } = input;
  if (previousOI === 0) return 50; // no baseline

  const changePct = (currentOI - previousOI) / previousOI;
  const changeAbs = Math.abs(currentOI - previousOI);

  let score = 0;

  // Percentage change score
  const pctScore = clamp(Math.abs(changePct) / 0.5 * 80);

  // Absolute change score
  const absScore = clamp((changeAbs / CFG.oiChangeAbsolute) * 70);

  score = Math.max(pctScore, absScore);

  if (input.oiHistory && input.oiHistory.length >= 5) {
    const dailyChanges = input.oiHistory
      .slice(1)
      .map((v, i) => Math.abs(v - input.oiHistory![i]) / Math.max(input.oiHistory![i], 1));
    const z = robustZScore(Math.abs(changePct), dailyChanges);
    score = Math.max(score, normalizeScore(z, 2));
  }

  return clamp(score);
}

// ─── H/I/J. Event proximity ───────────────────────────────────────────────────

export interface EventProximityInput {
  /** DTE of the option */
  dte: number;
  /** Days until nearest earnings (null if none found) */
  daysToEarnings?: number | null;
  /** Days until nearest FDA catalyst */
  daysToFda?: number | null;
  /** Days until nearest macro event (high importance) */
  daysToMacro?: number | null;
}

export function scoreEventProximity(input: EventProximityInput): number {
  const scores: number[] = [];
  const { dte } = input;

  const calcEventScore = (
    daysToEvent: number,
    windows: readonly number[],
    weight: number,
  ): number => {
    if (daysToEvent < 0) return 0;
    // Option must expire after the event but within 2x the window
    if (daysToEvent > dte) return 0; // event is after expiration

    const closestWindow = windows.find((w) => daysToEvent <= w);
    if (!closestWindow) return 0;
    // Tighter to the event = higher score
    const proximity = 1 - daysToEvent / closestWindow;
    return clamp(proximity * 100 * weight);
  };

  if (input.daysToEarnings != null) {
    // Earnings: highest-weight event
    scores.push(calcEventScore(input.daysToEarnings, CFG.earningsWindows, 1.0));
  }

  if (input.daysToFda != null) {
    scores.push(calcEventScore(input.daysToFda, CFG.fdaWindows, 0.9));
  }

  if (input.daysToMacro != null) {
    scores.push(calcEventScore(input.daysToMacro, CFG.macroWindows, 0.7));
  }

  return scores.length > 0 ? clamp(Math.max(...scores)) : 0;
}

// ─── F. Peer / sector sync ────────────────────────────────────────────────────

export interface PeerSyncInput {
  symbol: string;
  /** Number of peers also showing unusual flow in the time window */
  unusualPeerCount: number;
  /** Total peers in the group */
  totalPeers: number;
  /** Avg score of peer signals (optional) */
  avgPeerScore?: number;
}

export function scorePeerSync(input: PeerSyncInput): number {
  if (input.totalPeers === 0) return 0;
  const pct = input.unusualPeerCount / input.totalPeers;
  let score = pct * 100;

  if (input.unusualPeerCount >= CFG.minPeersForSync) {
    score = Math.min(100, score * 1.2); // bonus for broad peer sync
  }

  if (input.avgPeerScore !== undefined) {
    score = (score + input.avgPeerScore) / 2;
  }

  return clamp(score);
}

// ─── K. Directionality confidence ─────────────────────────────────────────────

export interface DirectionalityInput {
  optionType: "call" | "put";
  /** Trade price relative to bid-ask midpoint */
  priceMidpointPct?: number; // (tradePrice - bid) / (ask - bid), 0-1
  /** Aggressor side if known */
  aggressorSide?: "buy" | "sell" | "unknown";
  /** Strike vs spot moneyness */
  strikeVsSpot?: number; // strike / spot
  /** Delta */
  delta?: number;
}

export function scoreDirectionality(input: DirectionalityInput): number {
  let confidence = 50; // start neutral

  const { optionType, priceMidpointPct, aggressorSide, strikeVsSpot, delta } = input;

  // Aggressor side is the clearest signal
  if (aggressorSide === "buy") {
    confidence += optionType === "call" ? 25 : -25;
  } else if (aggressorSide === "sell") {
    confidence -= optionType === "call" ? 15 : -15;
  }

  // Price vs midpoint: above mid = more likely buy aggressor
  if (priceMidpointPct !== undefined) {
    if (priceMidpointPct > CFG.sweepBuyThreshold) {
      confidence += optionType === "call" ? 20 : -20;
    } else if (priceMidpointPct < CFG.sweepSellThreshold) {
      confidence -= optionType === "call" ? 10 : -10;
    }
  }

  // OTM call buys are typically bullish; OTM put buys are typically bearish
  if (strikeVsSpot !== undefined) {
    const isCallOtm = optionType === "call" && strikeVsSpot > 1.02;
    const isPutOtm = optionType === "put" && strikeVsSpot < 0.98;
    if (isCallOtm) confidence += 10;
    if (isPutOtm) confidence -= 10; // bearish
  }

  // Delta proxy
  if (delta !== undefined) {
    const absDelta = Math.abs(delta);
    if (absDelta > 0.7) confidence += 5; // deep ITM — stronger directional
    if (absDelta < 0.15) confidence -= 5; // far OTM — more speculative/lottery
  }

  // Map to 0-100 directional confidence score
  return clamp(confidence);
}

// ─── L. Combo structure confidence ───────────────────────────────────────────

export interface ComboInput {
  legCount: number;
  isLinkedByTime: boolean;
  isLinkedByExpiry: boolean;
  isLinkedByUnderlying: boolean;
  identifiedStructure?: "spread" | "straddle" | "strangle" | "risk_reversal" | "calendar" | "butterfly" | "condor" | "call_spread" | "put_spread" | "unknown";
}

export function scoreCombo(input: ComboInput): number {
  if (input.legCount < 2) return 0;

  let score = 30; // base for any multi-leg
  if (input.isLinkedByTime) score += 20;
  if (input.isLinkedByExpiry) score += 15;
  if (input.isLinkedByUnderlying) score += 10;

  const structureBonus: Record<string, number> = {
    spread: 15,
    straddle: 25,
    strangle: 20,
    risk_reversal: 20,
    calendar: 15,
    butterfly: 30,
    unknown: 0,
  };
  if (input.identifiedStructure) {
    score += structureBonus[input.identifiedStructure] ?? 0;
  }

  return clamp(score);
}

// ─── N. Theme sync ────────────────────────────────────────────────────────────

export interface ThemeSyncInput {
  /** How many signals in same theme in the rolling window */
  themeSignalCount: number;
  /** Average score of theme signals */
  avgThemeScore: number;
  /** Total names in the theme bucket */
  themeBucketSize: number;
}

export function scoreThemeSync(input: ThemeSyncInput): number {
  if (input.themeBucketSize === 0) return 0;
  const coverage = input.themeSignalCount / input.themeBucketSize;
  const coverageScore = clamp(coverage * 150); // saturates at 67% coverage
  const qualityScore = input.avgThemeScore;
  return clamp(Math.round((coverageScore * 0.6 + qualityScore * 0.4)));
}

// ─── M. No-known-event novelty ────────────────────────────────────────────────

export interface NoveltyInput {
  hasNearEarnings: boolean;
  hasNearFda: boolean;
  hasNearMacro: boolean;
  /** Whether there are any news in the last 24h (optional) */
  hasRecentNews?: boolean;
  /** Total score of the signal — high-score + no-event is most novel */
  baseSignalScore: number;
}

export function scoreNovelty(input: NoveltyInput): number {
  if (input.hasNearEarnings || input.hasNearFda || input.hasNearMacro) {
    // Event-driven flow is less "novel" (more explainable)
    return 10;
  }
  if (input.hasRecentNews) return 25;

  // Pure dark-pool / unknown reason flow
  const noveltyBase = 60;
  const qualityBonus = input.baseSignalScore > 70 ? 40 : input.baseSignalScore > 55 ? 20 : 0;
  return clamp(noveltyBase + qualityBonus);
}
