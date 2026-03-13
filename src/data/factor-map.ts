/**
 * Factor rotation buckets.
 *
 * Classic quantitative equity factors — unusual options flow concentrated within
 * a factor bucket can signal institutional rotation or hedging.
 */

export interface FactorBucketDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  /** Indicators / signals that suggest this factor is in rotation */
  rotationSignals: string[];
  members: string[];
}

export const FACTOR_BUCKETS: FactorBucketDef[] = [
  {
    id: "momentum",
    name: "Momentum",
    description: "Names with strong 12-1 month price momentum, typically outperforming over the past year",
    emoji: "🚀",
    rotationSignals: [
      "Broad call buying across momentum names",
      "Call-spread flow concentrated in recent breakout names",
      "Low DTE speculative calls in high-beta leaders",
    ],
    members: ["NVDA", "META", "AMZN", "PLTR", "AVGO"],
  },
  {
    id: "growth",
    name: "Growth",
    description: "High revenue growth companies with premium valuations — sensitive to rate moves",
    emoji: "🌱",
    rotationSignals: [
      "Call flow into rate-sensitive growth names ahead of FOMC",
      "Spread reduction in high-multiple software names",
      "Unusual straddle buying suggesting vol event expectation",
    ],
    members: ["NVDA", "META", "MSFT", "AMZN", "GOOGL", "PLTR"],
  },
  {
    id: "value",
    name: "Value",
    description: "Low P/E, P/B ratios; typically energy, financials, industrials, legacy tech",
    emoji: "💰",
    rotationSignals: [
      "Put selling (income generation) in low-vol value names",
      "Covered call patterns signaling bullish-but-cautious positioning",
      "Block trades in financial sector around rate catalysts",
    ],
    members: ["INTC", "XOM"],
  },
  {
    id: "quality",
    name: "Quality",
    description: "High ROE, low debt, stable earnings — defensive in risk-off environments",
    emoji: "🏛️",
    rotationSignals: [
      "Protective put buying rotating into quality from high-beta",
      "Large block trades in quality names during risk-off episodes",
    ],
    members: ["AAPL", "MSFT", "LLY"],
  },
  {
    id: "size-small",
    name: "Small Cap / Size",
    description: "Small and mid-cap names; IWM-driven; benefit from rate cuts and domestic economy",
    emoji: "📦",
    rotationSignals: [
      "IWM call buying ahead of soft-landing data",
      "Spread between IWM and SPY call skew widening",
    ],
    members: ["IWM", "CRSP"],
  },
  {
    id: "low-vol",
    name: "Low Volatility",
    description: "Low-beta, low-vol names that outperform in uncertainty; typical defensive rotation",
    emoji: "🧊",
    rotationSignals: [
      "Large put buying in high-beta names while low-vol names unchanged",
      "Protective put collars in defensive sectors",
    ],
    members: ["AAPL", "LLY", "NVO"],
  },
  {
    id: "high-beta",
    name: "High Beta / Speculative",
    description: "High-beta, volatile names that amplify market moves in both directions",
    emoji: "⚡",
    rotationSignals: [
      "Concentrated call sweeps across multiple high-beta names simultaneously",
      "OTM call buying with short DTE — lottery-ticket behavior",
      "Straddle buying into a high-beta name before macro catalyst",
    ],
    members: ["NVDA", "TSLA", "AMD", "SMCI", "MU", "MRNA", "CRSP"],
  },
  {
    id: "short-squeeze",
    name: "Short Interest / Squeeze-Prone",
    description: "Names with elevated short interest relative to float — susceptible to short squeezes",
    emoji: "🔥",
    rotationSignals: [
      "Aggressive OTM call buying in high-short-interest names",
      "Call sweeps with short DTE in heavily-shorted names",
      "Repeat accumulation pattern in squeeze candidates",
    ],
    members: ["SMCI", "MRNA", "CRSP", "TSLA"],
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getFactorsForSymbol(symbol: string): FactorBucketDef[] {
  return FACTOR_BUCKETS.filter((f) => f.members.includes(symbol));
}

export function getFactorById(id: string): FactorBucketDef | null {
  return FACTOR_BUCKETS.find((f) => f.id === id) ?? null;
}

export function getFactorMembers(factorId: string): string[] {
  return FACTOR_BUCKETS.find((f) => f.id === factorId)?.members ?? [];
}
