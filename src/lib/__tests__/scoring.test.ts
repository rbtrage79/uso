/**
 * Unit tests for the scoring engine.
 * Run: npx jest src/lib/__tests__/scoring.test.ts
 */

import { computeScore } from "../scoring/scorer";
import {
  scoreVolOi,
  scoreNotional,
  scoreIvAbnormality,
  scoreEventProximity,
  scoreDirectionality,
  scoreCombo,
  identifyStructure,
} from "../scoring/dimensions";
import type { RawTradeLeg } from "../../types/signals";

// ─── Scoring dimension tests ──────────────────────────────────────────────────

describe("scoreNotional", () => {
  test("below minimum → 0", () => {
    expect(scoreNotional(10_000)).toBe(0);
  });
  test("at minimum → ~20", () => {
    const s = scoreNotional(50_000);
    expect(s).toBeGreaterThanOrEqual(20);
    expect(s).toBeLessThan(40);
  });
  test("large block → 50+", () => {
    expect(scoreNotional(300_000)).toBeGreaterThan(50);
  });
  test("whale block → 100", () => {
    expect(scoreNotional(10_000_000)).toBe(100);
  });
});

describe("scoreVolOi", () => {
  test("low ratio → low score", () => {
    const s = scoreVolOi({ dayVolume: 100, openInterest: 10_000, historicalVolumes: [90, 110, 95] });
    expect(s).toBeLessThan(30);
  });
  test("vol > OI (ratio >1) → high score", () => {
    const s = scoreVolOi({ dayVolume: 15_000, openInterest: 10_000, historicalVolumes: [100, 110, 90] });
    expect(s).toBeGreaterThan(70);
  });
  test("historical spike → elevated score", () => {
    const history = Array.from({ length: 20 }, () => 200);
    const s = scoreVolOi({ dayVolume: 5_000, openInterest: 50_000, historicalVolumes: history });
    expect(s).toBeGreaterThan(60); // huge spike vs baseline
  });
});

describe("scoreIvAbnormality", () => {
  test("high IV rank → high score", () => {
    const s = scoreIvAbnormality({ currentIV: 0.8, ivRank: 90 });
    expect(s).toBeGreaterThan(60);
  });
  test("low IV rank → moderate score (cheap vol is interesting)", () => {
    const s = scoreIvAbnormality({ currentIV: 0.15, ivRank: 10 });
    expect(s).toBeGreaterThan(20);
  });
  test("mid IV rank → lower score", () => {
    const s = scoreIvAbnormality({ currentIV: 0.35, ivRank: 50 });
    expect(s).toBeLessThan(50);
  });
});

describe("scoreEventProximity", () => {
  test("no events → 0", () => {
    expect(scoreEventProximity({ dte: 30 })).toBe(0);
  });
  test("earnings in 3d with DTE=7 → high score", () => {
    const s = scoreEventProximity({ dte: 7, daysToEarnings: 3 });
    expect(s).toBeGreaterThan(70);
  });
  test("earnings after expiration → 0", () => {
    const s = scoreEventProximity({ dte: 7, daysToEarnings: 14 });
    expect(s).toBe(0);
  });
});

describe("scoreDirectionality", () => {
  test("buy call at ask → bullish ~85+", () => {
    const s = scoreDirectionality({
      optionType: "call",
      aggressorSide: "buy",
      priceMidpointPct: 0.9,
      strikeVsSpot: 1.05,
    });
    expect(s).toBeGreaterThan(80);
  });
  test("buy put below mid → bearish low score", () => {
    const s = scoreDirectionality({
      optionType: "put",
      aggressorSide: "buy",
      priceMidpointPct: 0.85,
    });
    // Put buy = bearish, directionality score < 50 indicates bearish lean
    // In our scale, score below 50 = bearish lean. Verify it's not bullish.
    expect(s).toBeLessThan(70);
  });
});

// ─── Combo structure tests ────────────────────────────────────────────────────

function makeLeg(overrides: Partial<RawTradeLeg> = {}): RawTradeLeg {
  return {
    contractTicker: "O:AAPL250228C00230000",
    underlying: "AAPL",
    expirationDate: new Date("2025-02-28"),
    strike: 230,
    optionType: "call",
    dte: 30,
    side: "buy",
    quantity: 500,
    premium: 150_000,
    priceAtTrade: 3.0,
    tradeTime: new Date(),
    ...overrides,
  };
}

describe("identifyStructure (combo detector)", () => {
  test("straddle detection", () => {
    const { identifyStructure } = require("../detection/combo-detector");
    const legs = [
      makeLeg({ optionType: "call", strike: 230 }),
      makeLeg({ optionType: "put",  strike: 230, contractTicker: "O:AAPL250228P00230000" }),
    ];
    const result = identifyStructure(legs);
    expect(result.type).toBe("straddle");
    expect(result.direction).toBe("neutral");
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test("bull call spread detection", () => {
    const { identifyStructure } = require("../detection/combo-detector");
    const legs = [
      makeLeg({ optionType: "call", strike: 225, side: "buy",  contractTicker: "O:AAPL250228C00225000" }),
      makeLeg({ optionType: "call", strike: 235, side: "sell", contractTicker: "O:AAPL250228C00235000" }),
    ];
    const result = identifyStructure(legs);
    expect(result.type).toBe("spread");
    expect(result.direction).toBe("bullish");
  });

  test("risk reversal detection", () => {
    const { identifyStructure } = require("../detection/combo-detector");
    const legs = [
      makeLeg({ optionType: "call", strike: 240, side: "buy",  contractTicker: "O:AAPL250228C00240000" }),
      makeLeg({ optionType: "put",  strike: 215, side: "sell", contractTicker: "O:AAPL250228P00215000" }),
    ];
    const result = identifyStructure(legs);
    expect(result.type).toBe("risk_reversal");
    expect(result.direction).toBe("bullish");
  });

  test("unknown structure → confidence < 0.5", () => {
    const { identifyStructure } = require("../detection/combo-detector");
    const legs = [makeLeg()]; // single leg
    const result = identifyStructure(legs);
    expect(result.confidence).toBeLessThan(0.5);
  });
});

// ─── End-to-end scorer tests ─────────────────────────────────────────────────

describe("computeScore (end-to-end)", () => {
  test("whale bullish call pre-earnings → score > 75", () => {
    const result = computeScore({
      optionType: "call",
      contracts: 3000,
      premium: 2_500_000,
      dte: 14,
      strike: 230,
      underlyingPrice: 228,
      volOi: {
        dayVolume: 8000,
        openInterest: 5000,
        historicalVolumes: Array.from({ length: 20 }, () => 300),
      },
      eventProximity: { dte: 14, daysToEarnings: 12 },
      directionality: { optionType: "call", aggressorSide: "buy", priceMidpointPct: 0.8 },
    });
    expect(result.totalScore).toBeGreaterThan(75);
    expect(result.direction).toBe("bullish");
  });

  test("tiny retail call → score < 40", () => {
    const result = computeScore({
      optionType: "call",
      contracts: 10,
      premium: 500,
      dte: 3,
      strike: 300,
    });
    expect(result.totalScore).toBeLessThan(40);
  });

  test("straddle combo → direction is neutral", () => {
    const result = computeScore({
      optionType: "call",
      contracts: 2000,
      premium: 1_200_000,
      dte: 7,
      strike: 594,
      combo: {
        legCount: 2,
        isLinkedByTime: true,
        isLinkedByExpiry: true,
        isLinkedByUnderlying: true,
        identifiedStructure: "straddle",
      },
    });
    expect(result.direction).toBe("neutral");
  });
});
