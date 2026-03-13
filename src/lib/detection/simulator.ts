/**
 * Trade Simulator — replays mock trades through the detection engine.
 * Used for development, testing, and the /backtest-lite page.
 */

import { ingestTrade, setBaseline } from "./flow-detector";
import { ingestLeg as ingestComboLeg } from "./combo-detector";
import { submitSignal, registerHandler, resetAggregator } from "./signal-aggregator";
import {
  generateMockTradeStream,
  generateMockSweep,
  MOCK_UNDERLYINGS,
} from "@/lib/polygon/mock";
import { parseOptionTicker } from "@/lib/utils/options-math";
import type { DetectedSignalPayload } from "@/types/signals";

export interface SimulationResult {
  totalTrades: number;
  detectedSignals: DetectedSignalPayload[];
  duration: number;
  stats: {
    bullish: number;
    bearish: number;
    neutral: number;
    combos: number;
    avgScore: number;
    highScore: number;
    totalPremium: number;
  };
}

/**
 * Seed realistic baselines for the mock underlyings.
 */
function seedBaselines() {
  const baseIVs = { AAPL: 0.28, NVDA: 0.55, TSLA: 0.65, SPY: 0.15, QQQ: 0.20, META: 0.42, AMD: 0.58, AMZN: 0.35, MRNA: 0.85, XBI: 0.40 };

  for (const u of MOCK_UNDERLYINGS) {
    const iv = baseIVs[u.sym as keyof typeof baseIVs] ?? 0.35;
    const baseOI = Math.floor(Math.random() * 50_000) + 10_000;
    const baseVol = Math.floor(Math.random() * 5_000) + 500;

    // Inject baseline for several fake contract tickers
    for (let strike = Math.round(u.price * 0.95 / 5) * 5;
         strike <= Math.round(u.price * 1.10 / 5) * 5;
         strike += 5) {
      for (const cp of ["call", "put"] as const) {
        // Format a ticker for 30 DTE
        const exp = new Date();
        exp.setDate(exp.getDate() + 30);
        while (exp.getDay() !== 5) exp.setDate(exp.getDate() + 1);
        const { formatOptionTicker } = require("@/lib/utils/options-math");
        const ticker = formatOptionTicker(u.sym, exp, cp, strike);

        setBaseline(ticker, {
          historicalDailyVolumes: Array.from({ length: 20 }, () =>
            baseVol * (0.5 + Math.random()),
          ),
          openInterest: baseOI,
          prevDayOI: Math.floor(baseOI * (0.95 + Math.random() * 0.1)),
          avgOI30d: baseOI,
          impliedVol: iv * (0.9 + Math.random() * 0.2),
          ivRank: Math.floor(Math.random() * 100),
          ivPercentile: Math.floor(Math.random() * 100),
          historicalIVs: Array.from({ length: 30 }, () => iv * (0.7 + Math.random() * 0.6)),
          realizedVol: iv * 0.85,
          sector: u.sector,
          peerGroup: [],
        });
      }
    }
  }
}

/**
 * Run a simulation with N mock trades.
 * Returns all signals detected by the engine.
 */
export async function runSimulation(
  opts: {
    tradeCount?: number;
    unusualRate?: number;
    includeSweeps?: boolean;
    includeCombo?: boolean;
  } = {},
): Promise<SimulationResult> {
  const {
    tradeCount = 500,
    unusualRate = 0.15,
    includeSweeps = true,
    includeCombo = true,
  } = opts;

  const t0 = Date.now();
  const signals: DetectedSignalPayload[] = [];

  // Setup
  resetAggregator();
  seedBaselines();
  registerHandler((s) => { signals.push(s); });

  // Generate trade stream
  const trades = generateMockTradeStream(tradeCount, unusualRate);

  // Optionally inject some sweeps
  if (includeSweeps) {
    for (const u of MOCK_UNDERLYINGS.slice(0, 3)) {
      const sweep = generateMockSweep(u.sym, u.price);
      trades.push(...sweep);
    }
  }

  // Replay trades through detectors
  const spotPrices: Record<string, number> = Object.fromEntries(
    MOCK_UNDERLYINGS.map((u) => [u.sym, u.price]),
  );

  for (const trade of trades) {
    const parsed = parseOptionTicker(trade.sym);
    if (!parsed) continue;

    const ctx = {
      underlyingPrice: spotPrices[parsed.underlying],
      daysToEarnings: Math.random() < 0.2 ? Math.floor(Math.random() * 14) + 1 : null,
      daysToFda: null,
      daysToMacro: Math.random() < 0.1 ? Math.floor(Math.random() * 7) + 1 : null,
      unusualPeerCount: Math.random() < 0.15 ? Math.floor(Math.random() * 4) : 0,
      totalPeers: 8,
    };

    const signal = ingestTrade(trade, ctx);
    if (signal) await submitSignal(signal);

    // Also route to combo detector
    if (includeCombo && signal?.legs?.[0]) {
      const comboResult = ingestComboLeg(signal.legs[0]);
      if (comboResult) await submitSignal(comboResult);
    }
  }

  const duration = Date.now() - t0;

  const stats = {
    bullish: signals.filter((s) => s.direction === "bullish").length,
    bearish: signals.filter((s) => s.direction === "bearish").length,
    neutral: signals.filter((s) => s.direction === "neutral").length,
    combos: signals.filter((s) => s.isCombo).length,
    avgScore: signals.length > 0
      ? Math.round(signals.reduce((a, s) => a + s.totalScore, 0) / signals.length)
      : 0,
    highScore: signals.length > 0 ? Math.max(...signals.map((s) => s.totalScore)) : 0,
    totalPremium: signals.reduce((a, s) => a + s.totalPremium, 0),
  };

  return { totalTrades: trades.length, detectedSignals: signals, duration, stats };
}
