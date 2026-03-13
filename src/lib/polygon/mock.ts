/**
 * Mock Polygon data — used when MOCK_MODE=true or POLYGON_API_KEY is absent.
 * Simulates realistic options trade events for the detection engine.
 */

import type { PolygonWsOptionTrade, PolygonWsOptionQuote, PolygonOptionChainResult } from "@/types/polygon";
import { formatOptionTicker } from "@/lib/utils/options-math";

const MOCK_UNDERLYINGS = [
  { sym: "AAPL", price: 228, sector: "Technology" },
  { sym: "NVDA", price: 875, sector: "Technology" },
  { sym: "TSLA", price: 248, sector: "Consumer Discretionary" },
  { sym: "SPY",  price: 594, sector: "ETF" },
  { sym: "QQQ",  price: 518, sector: "ETF" },
  { sym: "META", price: 582, sector: "Technology" },
  { sym: "AMD",  price: 168, sector: "Technology" },
  { sym: "AMZN", price: 223, sector: "Consumer Discretionary" },
  { sym: "MRNA", price: 38,  sector: "Healthcare" },
  { sym: "XBI",  price: 91,  sector: "Healthcare ETF" },
];

/** Upcoming expirations (0, 7, 14, 30, 45, 60, 90 DTE) */
function getExpiry(dte: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + dte);
  // Round to Friday (options expiration)
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
  return d;
}

const EXPIRIES_DTE = [0, 7, 14, 30, 45, 60, 90];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a realistic mock options trade event.
 */
export function generateMockTrade(
  overrides: Partial<{ sym: string; price: number; unusualFlag: boolean }> = {},
): PolygonWsOptionTrade {
  const underlying = pick(MOCK_UNDERLYINGS);
  const sym = overrides.sym ?? underlying.sym;
  const spot = overrides.price ?? underlying.price;
  const unusual = overrides.unusualFlag ?? Math.random() < 0.15;

  const callOrPut = Math.random() < 0.55 ? "C" : "P";
  // Strike: near-the-money ± 5–20% for unusual
  const strikePct = unusual
    ? callOrPut === "C" ? rand(1.01, 1.12) : rand(0.88, 0.99)
    : rand(0.95, 1.05);
  const strike = Math.round(spot * strikePct / 5) * 5; // round to $5

  const dte = unusual ? pick([7, 14, 30]) : pick(EXPIRIES_DTE);
  const expiry = getExpiry(dte);
  const ticker = formatOptionTicker(sym, expiry, callOrPut === "C" ? "call" : "put", strike);

  const basePrice = spot * 0.03 * (1 + rand(-0.5, 0.5));
  const price = Math.max(0.01, Math.round(basePrice * 100) / 100);
  const size = unusual ? randInt(200, 2000) : randInt(1, 50);

  return {
    ev: "T",
    sym: ticker,
    x: pick([4, 10, 12, 17]), // exchange IDs
    p: price,
    s: size,
    c: pick([[14], [41], [14, 41], []]), // conditions
    t: Date.now(),
    q: Math.floor(Math.random() * 1e9),
  };
}

/**
 * Generate a stream of mock trades — mix of noise and unusual.
 * Returns an array of N trades.
 */
export function generateMockTradeStream(
  n = 100,
  unusualRate = 0.12,
): PolygonWsOptionTrade[] {
  return Array.from({ length: n }, () =>
    generateMockTrade({ unusualFlag: Math.random() < unusualRate }),
  );
}

/**
 * Generate a mock options chain snapshot for an underlying.
 */
export function generateMockChain(
  underlying: string,
  spot: number,
  dte = 30,
): PolygonOptionChainResult[] {
  const expiry = getExpiry(dte);
  const expirationDate = expiry.toISOString().slice(0, 10);
  const strikes = Array.from({ length: 11 }, (_, i) =>
    Math.round(spot * (0.85 + i * 0.03) / 5) * 5,
  );

  const results: PolygonOptionChainResult[] = [];

  for (const strike of strikes) {
    for (const ct of ["call", "put"] as const) {
      const isCall = ct === "call";
      const moneyness = isCall ? spot / strike : strike / spot;
      const iv = 0.3 + (1 - moneyness) * 0.4 + rand(0, 0.1);
      const delta = isCall ? Math.max(0.05, Math.min(0.95, moneyness - 0.5 + 0.5)) : Math.max(-0.95, Math.min(-0.05, moneyness - 1.5 + 0.5));
      const midPrice = Math.max(0.05, spot * iv * Math.sqrt(dte / 365) * 0.4);
      const bid = Math.max(0.01, midPrice * 0.97);
      const ask = midPrice * 1.03;
      const oi = randInt(100, 50_000);
      const volume = randInt(10, Math.floor(oi * 0.2));
      const ticker = formatOptionTicker(underlying, expiry, ct, strike);

      results.push({
        break_even_price: isCall ? strike + midPrice : strike - midPrice,
        day: {
          change: rand(-0.5, 0.5),
          change_percent: rand(-5, 5),
          close: midPrice,
          high: midPrice * 1.1,
          last_updated: Date.now() * 1_000_000,
          low: midPrice * 0.9,
          open: midPrice * 0.98,
          previous_close: midPrice * 0.98,
          volume,
          vwap: midPrice,
        },
        details: {
          contract_type: ct,
          exercise_style: "american",
          expiration_date: expirationDate,
          shares_per_contract: 100,
          strike_price: strike,
          ticker,
        },
        greeks: {
          delta: Math.round(delta * 100) / 100,
          gamma: rand(0.001, 0.05),
          theta: -rand(0.01, 0.5),
          vega: rand(0.05, 0.5),
        },
        implied_volatility: Math.round(iv * 1000) / 1000,
        last_quote: { ask, ask_size: randInt(10, 500), bid, bid_size: randInt(10, 500), last_updated: Date.now() * 1_000_000, midpoint: (bid + ask) / 2, timeframe: "REAL-TIME" },
        last_trade: null,
        open_interest: oi,
        underlying_asset: {
          change_to_break_even: isCall ? strike + midPrice - spot : spot - (strike - midPrice),
          last_updated: Date.now() * 1_000_000,
          price: spot,
          ticker: underlying,
          timeframe: "REAL-TIME",
        },
      });
    }
  }

  return results;
}

/**
 * Simulate a sweep event — multiple trades in quick succession on same strike.
 */
export function generateMockSweep(sym: string, spot: number): PolygonWsOptionTrade[] {
  const callOrPut: "call" | "put" = Math.random() < 0.6 ? "call" : "put";
  const strike = Math.round(spot * (callOrPut === "call" ? 1.05 : 0.95) / 5) * 5;
  const dte = pick([7, 14, 21]);
  const expiry = getExpiry(dte);
  const ticker = formatOptionTicker(sym, expiry, callOrPut, strike);
  const price = Math.max(0.05, spot * 0.02 * (1 + rand(-0.2, 0.2)));

  // 3–8 legs in 50ms each
  const numLegs = randInt(3, 8);
  return Array.from({ length: numLegs }, (_, i) => ({
    ev: "T" as const,
    sym: ticker,
    x: pick([4, 10, 12, 17]),
    p: price + rand(-0.02, 0.02),
    s: randInt(100, 500),
    c: [14], // sweep condition
    t: Date.now() + i * 50,
    q: Math.floor(Math.random() * 1e9) + i,
  }));
}

export { MOCK_UNDERLYINGS };
