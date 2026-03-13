/**
 * Mock strike/expiry heatmap data for AAPL.
 * 10 strikes × 6 expirations = 60 cells.
 * ATM ≈ $215. Strikes: $185–$240 in $5 steps.
 * Expirations: current week through quarterly.
 */

import type { HeatmapCell } from "@/types/features";

type Row = HeatmapCell[];

// Expiration labels and DTE
const EXPIRATIONS = [
  { label: "Mar 14", iso: "2026-03-14", dte: 1 },
  { label: "Mar 21", iso: "2026-03-21", dte: 8 },
  { label: "Mar 28", iso: "2026-03-28", dte: 15 },
  { label: "Apr 17", iso: "2026-04-17", dte: 35 },
  { label: "May 15", iso: "2026-05-15", dte: 63 },
  { label: "Jun 19", iso: "2026-06-19", dte: 98 },
];

const ATM = 215;
const STRIKES = [185, 190, 195, 200, 205, 210, 215, 220, 225, 230, 235, 240];

// Realistic distribution: ATM is most active; calls dominate near-term OTM, puts dominate deep OTM
function makeCell(
  strike: number,
  exp: (typeof EXPIRATIONS)[number],
): HeatmapCell {
  const moneyness = (strike - ATM) / ATM; // negative = ITM call / OTM put
  const dteFactor = Math.max(0.1, 1 - exp.dte / 120); // shorter DTE = higher concentration
  const isATM = Math.abs(strike - ATM) <= 5;

  // Base OI: ATM is highest, tails off
  const baseMultiplier = Math.exp(-Math.pow(moneyness / 0.08, 2));

  // Calls: most active slightly OTM
  const callBias = strike >= ATM - 5 && strike <= ATM + 20 ? 1.0 : 0.4;
  const putBias = strike <= ATM + 5 && strike >= ATM - 20 ? 1.0 : 0.35;

  const callOI = Math.round(
    8_000 * baseMultiplier * callBias * (dteFactor * 0.6 + 0.4) * (0.8 + Math.random() * 0.4),
  );
  const putOI = Math.round(
    6_500 * baseMultiplier * putBias * (dteFactor * 0.6 + 0.4) * (0.8 + Math.random() * 0.4),
  );

  // Volume: shorter DTE = more active volume
  const callVolume = Math.round(callOI * 0.15 * (dteFactor * 1.5 + 0.3) * (0.7 + Math.random() * 0.6));
  const putVolume = Math.round(putOI * 0.12 * (dteFactor * 1.5 + 0.3) * (0.7 + Math.random() * 0.6));

  // Premium = rough mid-point estimate (simplified: IV ≈ 35%)
  const approxIV = 0.35;
  const t = exp.dte / 365;
  const approxOptionPrice = ATM * approxIV * Math.sqrt(t) * 0.4; // rough BS approximation
  const callPremium = Math.round(callVolume * approxOptionPrice * 100);
  const putPremium = Math.round(putVolume * approxOptionPrice * 100);

  const netFlow =
    callPremium > putPremium * 1.4
      ? "call"
      : putPremium > callPremium * 1.4
        ? "put"
        : "neutral";

  const totalFlow = callPremium + putPremium;
  const intensity = Math.min(1, totalFlow / 2_000_000);

  return {
    strike,
    expiration: exp.label,
    expirationISO: exp.iso,
    dte: exp.dte,
    callOI,
    putOI,
    callVolume,
    putVolume,
    callPremium,
    putPremium,
    netFlow,
    intensity,
    isATM,
  };
}

// Build the grid: rows = strikes, cols = expirations
export const MOCK_HEATMAP_AAPL: Row[] = STRIKES.map((strike) =>
  EXPIRATIONS.map((exp) => makeCell(strike, exp)),
);

// Add a few manually crafted "hot" cells to make it look realistic
// Earnings-related spike: Mar 21, $220C
const earningsRow = MOCK_HEATMAP_AAPL.findIndex((r) => r[0].strike === 220);
if (earningsRow !== -1) {
  const cell = MOCK_HEATMAP_AAPL[earningsRow][1]; // Mar 21
  cell.callOI = 28_400;
  cell.callVolume = 6_200;
  cell.callPremium = 4_340_000;
  cell.netFlow = "call";
  cell.intensity = 0.92;
}

// Protective put wall: Apr 17, $200P
const putRow = MOCK_HEATMAP_AAPL.findIndex((r) => r[0].strike === 200);
if (putRow !== -1) {
  const cell = MOCK_HEATMAP_AAPL[putRow][3]; // Apr 17
  cell.putOI = 31_200;
  cell.putVolume = 4_800;
  cell.putPremium = 3_120_000;
  cell.netFlow = "put";
  cell.intensity = 0.88;
}

// High conviction ATM straddle: Mar 21 $215
const straddleRow = MOCK_HEATMAP_AAPL.findIndex((r) => r[0].strike === 215);
if (straddleRow !== -1) {
  const cell = MOCK_HEATMAP_AAPL[straddleRow][1]; // Mar 21
  cell.callOI = 18_200;
  cell.putOI = 16_900;
  cell.callVolume = 3_400;
  cell.putVolume = 3_100;
  cell.callPremium = 2_720_000;
  cell.putPremium = 2_480_000;
  cell.netFlow = "neutral";
  cell.intensity = 0.85;
}

export const HEATMAP_STRIKES = STRIKES;
export const HEATMAP_EXPIRATIONS = EXPIRATIONS;
