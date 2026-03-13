/**
 * Factor Rotation Enricher — detects unusual options flow concentrated within
 * factor buckets, suggesting institutional rotation or hedging.
 */

import { getFactorsForSymbol, FACTOR_BUCKETS, type FactorBucketDef } from "@/data/factor-map";

export interface FactorEnrichment {
  /** Factor buckets this symbol belongs to */
  factors: FactorBucketDef[];
  factorIds: string[];

  /** Detected factor rotation clusters */
  activeRotations: FactorRotation[];

  /** Primary rotation (highest score) */
  primaryRotation?: FactorRotation;

  /** 0-100: overall factor rotation signal strength */
  factorRotationScore: number;

  /** Human-readable rotation narrative */
  rotationNarrative?: string;
}

export interface FactorRotation {
  factorId: string;
  factorName: string;
  factorEmoji: string;
  rotationSignals: string[];

  activeMembers: string[];
  totalMembers: number;
  coveragePct: number;

  bullishCount: number;
  bearishCount: number;
  dominantDirection: "bullish" | "bearish" | "mixed";

  avgScore: number;
  totalPremium: number;
  rotationScore: number; // 0-100

  /** Is this a RISK-ON or RISK-OFF rotation? */
  riskSentiment: "risk-on" | "risk-off" | "neutral";
}

export interface FactorSignalInput {
  symbol: string;
  direction: "bullish" | "bearish" | "neutral";
  totalScore: number;
  totalPremium: number;
}

export function enrichFactors(
  symbol: string,
  recentSignals: FactorSignalInput[] = [],
): FactorEnrichment {
  const factors = getFactorsForSymbol(symbol);
  const factorIds = factors.map((f) => f.id);

  const activeRotations: FactorRotation[] = [];

  for (const factor of FACTOR_BUCKETS) {
    const rotation = buildRotation(factor, recentSignals);
    if (rotation.activeMembers.length >= 1) {
      activeRotations.push(rotation);
    }
  }

  // Filter to only factors this symbol is in, or where coverage ≥ 2 members
  const relevant = activeRotations.filter(
    (r) => factorIds.includes(r.factorId) || r.activeMembers.length >= 2,
  );
  relevant.sort((a, b) => b.rotationScore - a.rotationScore);

  const primaryRotation = relevant[0];

  const baseScore = primaryRotation?.rotationScore ?? 0;
  const multiBonus = Math.min(relevant.length * 5, 15);
  const factorRotationScore = Math.min(100, Math.round(baseScore + multiBonus));

  const rotationNarrative = primaryRotation
    ? buildNarrative(primaryRotation)
    : undefined;

  return {
    factors,
    factorIds,
    activeRotations: relevant,
    primaryRotation,
    factorRotationScore,
    rotationNarrative,
  };
}

function buildRotation(factor: FactorBucketDef, signals: FactorSignalInput[]): FactorRotation {
  const memberSet = new Set(factor.members);
  const active = signals.filter((s) => memberSet.has(s.symbol));

  const bullishCount = active.filter((s) => s.direction === "bullish").length;
  const bearishCount = active.filter((s) => s.direction === "bearish").length;

  let dominantDirection: FactorRotation["dominantDirection"] = "mixed";
  if (bullishCount > 0 && bearishCount === 0) dominantDirection = "bullish";
  else if (bearishCount > 0 && bullishCount === 0) dominantDirection = "bearish";

  const avgScore = active.length > 0
    ? Math.round(active.reduce((s, a) => s + a.totalScore, 0) / active.length)
    : 0;
  const totalPremium = active.reduce((s, a) => s + a.totalPremium, 0);
  const coveragePct = factor.members.length > 0 ? active.length / factor.members.length : 0;

  // Risk sentiment heuristics
  let riskSentiment: FactorRotation["riskSentiment"] = "neutral";
  if (["high-beta", "momentum", "growth", "short-squeeze"].includes(factor.id)) {
    riskSentiment = dominantDirection === "bullish" ? "risk-on" : "risk-off";
  } else if (["low-vol", "quality", "value"].includes(factor.id)) {
    riskSentiment = dominantDirection === "bullish" ? "risk-off" : "neutral";
  }

  const coverageScore = Math.min(100, Math.round(coveragePct * 150));
  const rotationScore = Math.min(100, Math.round(coverageScore * 0.5 + avgScore * 0.5));

  return {
    factorId: factor.id,
    factorName: factor.name,
    factorEmoji: factor.emoji,
    rotationSignals: factor.rotationSignals,
    activeMembers: active.map((s) => s.symbol),
    totalMembers: factor.members.length,
    coveragePct,
    bullishCount, bearishCount,
    dominantDirection,
    avgScore, totalPremium,
    rotationScore,
    riskSentiment,
  };
}

function buildNarrative(rotation: FactorRotation): string {
  const dir = rotation.dominantDirection;
  const factor = rotation.factorName;
  const members = rotation.activeMembers.join(", ");
  const risk = rotation.riskSentiment;

  if (dir === "bullish" && risk === "risk-on") {
    return `${rotation.factorEmoji} Risk-on rotation into ${factor} — ${members} showing coordinated call buying`;
  }
  if (dir === "bearish" && risk === "risk-off") {
    return `${rotation.factorEmoji} Risk-off rotation out of ${factor} — ${members} seeing put accumulation`;
  }
  if (dir === "bullish") {
    return `${rotation.factorEmoji} Broad ${factor} flow — ${members} accumulating calls`;
  }
  if (dir === "bearish") {
    return `${rotation.factorEmoji} ${factor} hedging — ${members} buying puts`;
  }
  return `${rotation.factorEmoji} Mixed ${factor} flow across ${members}`;
}

/** Standalone: detect factor rotations from a signal window */
export function detectFactorRotations(signals: FactorSignalInput[]): FactorRotation[] {
  return FACTOR_BUCKETS
    .map((f) => buildRotation(f, signals))
    .filter((r) => r.activeMembers.length >= 2)
    .sort((a, b) => b.rotationScore - a.rotationScore);
}
