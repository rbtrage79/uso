/**
 * Options math utilities — DTE, ticker parsing, formatting, stat helpers.
 */

import type { ParsedOptionTicker } from "@/types/polygon";

// ─── Ticker formatting ─────────────────────────────────────────────────────────

/**
 * Build a Polygon option ticker string.
 * e.g. O:AAPL231215C00180000
 */
export function formatOptionTicker(
  underlying: string,
  expiration: Date,
  type: "call" | "put",
  strike: number,
): string {
  const yy = String(expiration.getFullYear()).slice(-2);
  const mm = String(expiration.getMonth() + 1).padStart(2, "0");
  const dd = String(expiration.getDate()).padStart(2, "0");
  const cp = type === "call" ? "C" : "P";
  const strikeStr = String(Math.round(strike * 1000)).padStart(8, "0");
  return `O:${underlying.toUpperCase()}${yy}${mm}${dd}${cp}${strikeStr}`;
}

/**
 * Parse a Polygon option ticker string.
 */
export function parseOptionTicker(ticker: string): ParsedOptionTicker | null {
  // Remove "O:" prefix if present
  const raw = ticker.startsWith("O:") ? ticker.slice(2) : ticker;
  // Regex: UNDERLYING(letters) + YYMMDD + C/P + 8-digit strike
  const match = raw.match(/^([A-Z]{1,6})(\d{6})([CP])(\d{8})$/);
  if (!match) return null;

  const [, underlying, dateStr, cp, strikeStr] = match;
  const yy = parseInt(dateStr.slice(0, 2));
  const mm = parseInt(dateStr.slice(2, 4)) - 1;
  const dd = parseInt(dateStr.slice(4, 6));
  const expiration = new Date(2000 + yy, mm, dd);
  const strike = parseInt(strikeStr) / 1000;
  const dte = Math.ceil((expiration.getTime() - Date.now()) / 86_400_000);

  return {
    raw: ticker,
    underlying,
    expiration,
    optionType: cp === "C" ? "call" : "put",
    strike,
    dte: Math.max(0, dte),
  };
}

// ─── DTE helpers ──────────────────────────────────────────────────────────────

export function calcDte(expiration: Date, asOf = new Date()): number {
  const ms = expiration.getTime() - asOf.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function isWeekly(dte: number): boolean {
  return dte <= 8;
}
export function isMonthly(dte: number): boolean {
  return dte > 8 && dte <= 40;
}

// ─── Stats helpers ────────────────────────────────────────────────────────────

/**
 * Rolling z-score: how many std-devs is `value` above the `history` mean?
 * Returns 0 when history is insufficient.
 */
export function zScore(value: number, history: number[]): number {
  if (history.length < 5) return 0;
  const n = history.length;
  const mean = history.reduce((a, b) => a + b, 0) / n;
  const variance = history.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return (value - mean) / std;
}

/**
 * Percentile rank of `value` within `population` (0–100).
 */
export function percentileRank(value: number, population: number[]): number {
  if (population.length === 0) return 50;
  const below = population.filter((v) => v < value).length;
  return Math.round((below / population.length) * 100);
}

/**
 * Median of an array.
 */
export function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Median Absolute Deviation — more robust than std for outlier detection.
 */
export function mad(arr: number[]): number {
  const m = median(arr);
  const devs = arr.map((v) => Math.abs(v - m));
  return median(devs);
}

/**
 * Modified Z-score using MAD — robust to outliers.
 * Typical threshold: |score| > 3.5 → unusual.
 */
export function robustZScore(value: number, population: number[]): number {
  const m = median(population);
  const d = mad(population);
  if (d === 0) return 0;
  return (0.6745 * (value - m)) / d;
}

/**
 * Clamp a value to [min, max].
 */
export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalize a raw score (e.g. z-score) to 0-100 using a sigmoid-like curve.
 * `scale` controls how quickly the score saturates.
 */
export function normalizeScore(rawZ: number, scale = 3): number {
  // sigmoid: 1 / (1 + e^(-x/scale)) mapped to 0-100
  const sigmoid = 1 / (1 + Math.exp(-rawZ / scale));
  return clamp(Math.round(sigmoid * 100));
}

// ─── Premium helpers ──────────────────────────────────────────────────────────

export function calcPremium(price: number, contracts: number, multiplier = 100): number {
  return price * contracts * multiplier;
}

/** Format premium as $1.2M, $450K, $85K etc. */
export function formatPremium(dollars: number): string {
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${Math.round(dollars / 1_000)}K`;
  return `$${Math.round(dollars)}`;
}

/** Delta-adjusted notional: contracts × 100 × spotPrice × |delta| */
export function deltaAdjustedNotional(
  contracts: number,
  spotPrice: number,
  delta: number,
): number {
  return Math.abs(contracts * 100 * spotPrice * delta);
}
