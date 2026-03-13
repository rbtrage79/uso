/**
 * Insight Generator — produces retail-facing natural language summaries
 * for every enriched signal.
 *
 * Fields:
 *   - whatTheyMayBeBettingOn
 *   - whyInterestingNow
 *   - whatCouldInvalidate
 *   - isKnownCatalyst / earningsWithinExpiry
 *   - unusualness: routine | noteworthy | unusual | extreme
 *   - institutionalLook + institutionalScore (0-100)
 */

import type { EventEnrichment } from "./event-enricher";
import type { PeerEnrichment } from "./peer-enricher";
import type { ThemeEnrichment } from "./theme-enricher";
import type { FactorEnrichment } from "./factor-enricher";

export interface InsightPayload {
  /** "What they may be betting on" */
  whatTheyMayBeBettingOn: string;
  /** "Why this is interesting now" */
  whyInterestingNow: string;
  /** "What could invalidate this view" */
  whatCouldInvalidate: string;
  /** Is there a known catalyst? */
  isKnownCatalyst: boolean;
  catalystDescription?: string;
  /** Does earnings fall within this expiry? */
  earningsWithinExpiry: boolean;
  /** How unusual is this vs normal? */
  unusualness: "routine" | "noteworthy" | "unusual" | "extreme";
  unusualnessReason: string;
  /** Institutional-looking or not? */
  institutionalLook: boolean;
  institutionalScore: number; // 0-100
  institutionalReasons: string[];
  retailReasons: string[];
  /** Directional summary */
  directionSummary: string;
  /** Short one-liner for cards */
  oneLiner: string;
}

export interface InsightInput {
  symbol: string;
  direction: "bullish" | "bearish" | "neutral";
  optionType: "call" | "put";
  totalScore: number;
  totalPremium: number;
  totalContracts: number;
  dte: number;
  strike?: number;
  underlyingPrice?: number;
  signalType: string;
  isCombo: boolean;
  impliedVol?: number;
  volOiScore?: number;
  notionalScore?: number;
  noveltyScore?: number;
  peerSyncScore?: number;
  events: EventEnrichment;
  peers: PeerEnrichment;
  themes: ThemeEnrichment;
  factors: FactorEnrichment;
}

const PREMIUM_LABEL = (p: number) =>
  p >= 5_000_000 ? "massive" :
  p >= 1_000_000 ? "large" :
  p >= 500_000   ? "notable" : "moderate";

const CONTRACTS_LABEL = (c: number) =>
  c >= 5000 ? "whale-sized" : c >= 1000 ? "institutional-sized" : c >= 200 ? "notable" : "small";

export function generateInsights(input: InsightInput): InsightPayload {
  const {
    symbol, direction, optionType, totalScore, totalPremium, totalContracts,
    dte, strike, underlyingPrice, signalType, isCombo, impliedVol,
    events, peers, themes, factors,
  } = input;

  const isCall = optionType === "call";
  const isPut = optionType === "put";
  const isBullish = direction === "bullish";
  const isBearish = direction === "bearish";
  const isNeutral = direction === "neutral";

  // ── What they may be betting on ─────────────────────────────────────────────
  let whatTheyMayBeBettingOn = "";

  if (events.isEarningsPlay) {
    whatTheyMayBeBettingOn = isBullish
      ? `A strong earnings beat from ${symbol} — the option expires ${dte < events.daysToEarnings! + 5 ? "right around" : "shortly after"} the Q${currentQuarter()} report`
      : isBearish
      ? `A disappointing earnings result from ${symbol} — bearish positioning ahead of the report`
      : `A large post-earnings move in ${symbol} — straddle positioning capturing either direction`;
  } else if (events.isFdaPlay) {
    whatTheyMayBeBettingOn = isBullish
      ? `FDA approval of ${events.fdaName ?? "a key drug"} — binary bet on a positive regulatory outcome`
      : `FDA rejection or delay risk in ${events.fdaName ?? "a key drug"} — hedging or bearish FDA bet`;
  } else if (events.isMacroPlay) {
    whatTheyMayBeBettingOn = isBullish
      ? `A market-friendly outcome from ${events.macroName ?? "a macro event"} — rate cut signal or soft CPI`
      : `A risk-off macro catalyst — ${events.macroName ?? "upcoming macro event"} coming in worse than expected`;
  } else if (themes.primaryThemeName) {
    whatTheyMayBeBettingOn = isBullish
      ? `Continued outperformance in the ${themes.primaryThemeName} theme — ${symbol} as a key beneficiary`
      : `A pullback in ${themes.primaryThemeName} exposure — rotating out or hedging the theme`;
  } else if (factors.primaryRotation) {
    whatTheyMayBeBettingOn = `${factors.rotationNarrative ?? `Factor rotation into ${factors.primaryRotation.factorName}`}`;
  } else if (peers.activePeerSymbols.length >= 2) {
    whatTheyMayBeBettingOn = `Sector-wide move — ${peers.activePeerSymbols.slice(0, 3).join(", ")} also showing unusual flow`;
  } else {
    whatTheyMayBeBettingOn = isBullish
      ? `${symbol} stock moving higher — ${PREMIUM_LABEL(totalPremium)} directional bet with no obvious catalyst`
      : isBearish
      ? `${symbol} declining — ${PREMIUM_LABEL(totalPremium)} bearish positioning, possibly informed flow`
      : `A large ${symbol} move in either direction — straddling for volatility`;
  }

  // ── Why interesting now ──────────────────────────────────────────────────────
  const whyParts: string[] = [];

  if (totalPremium >= 1_000_000) {
    whyParts.push(`${formatPremium(totalPremium)} in premium is ${PREMIUM_LABEL(totalPremium)} by any measure`);
  }
  if (totalContracts >= 1000) {
    whyParts.push(`${totalContracts.toLocaleString()} contracts is ${CONTRACTS_LABEL(totalContracts)}`);
  }
  if (events.hasKnownCatalyst) {
    whyParts.push(`there is a known catalyst (${events.nearestEventName}) in ${events.daysToNearestEvent}d`);
  }
  if (peers.peerSyncScore >= 40) {
    whyParts.push(`${peers.activePeerSymbols.length} peers (${peers.activePeerSymbols.slice(0,2).join(", ")}) are also seeing unusual flow`);
  }
  if (themes.primaryCluster && themes.primaryCluster.activeMembers.length >= 2) {
    whyParts.push(`theme synchronization detected in ${themes.primaryThemeName}`);
  }
  if (input.volOiScore && input.volOiScore >= 70) {
    whyParts.push("today's volume dramatically exceeds open interest — new position, not a roll");
  }
  if (impliedVol && impliedVol >= 0.6) {
    whyParts.push(`IV is elevated at ${Math.round(impliedVol * 100)}% — options are expensive; someone is still paying up`);
  }

  const whyInterestingNow = whyParts.length > 0
    ? capitalize(whyParts.join("; ")) + "."
    : `Score of ${totalScore}/100 puts this in the top tier of unusual flow signals detected today.`;

  // ── What could invalidate ────────────────────────────────────────────────────
  let whatCouldInvalidate = "";
  if (events.isEarningsPlay) {
    whatCouldInvalidate = isBullish
      ? "An earnings miss or weak guidance would invalidate the bullish thesis. Also watch for a 'sell the news' reaction even on a beat."
      : "A strong earnings beat with raised guidance would invalidate the bearish thesis.";
  } else if (events.isFdaPlay) {
    whatCouldInvalidate = "An unexpected FDA approval or delay would invalidate this position. Binary events carry complete-loss risk.";
  } else if (events.isMacroPlay) {
    whatCouldInvalidate = isBullish
      ? "Hotter-than-expected inflation data or hawkish Fed language would invalidate the bullish macro read."
      : "A softer-than-expected data print or dovish pivot would invalidate the bearish thesis.";
  } else {
    whatCouldInvalidate = isBullish
      ? "Broader market risk-off, unexpected negative news, or the stock failing to hold technical levels would invalidate this bet."
      : "A short squeeze, positive surprise, or broader risk-on rally could invalidate the bearish position.";
  }

  // ── Institutional score ──────────────────────────────────────────────────────
  const institutionalReasons: string[] = [];
  const retailReasons: string[] = [];
  let institutionalScore = 50;

  if (totalContracts >= 500) { institutionalScore += 15; institutionalReasons.push(`${totalContracts.toLocaleString()} contracts — above retail typical size`); }
  if (totalPremium >= 500_000) { institutionalScore += 10; institutionalReasons.push(`${formatPremium(totalPremium)} in notional — large absolute size`); }
  if (signalType === "block") { institutionalScore += 10; institutionalReasons.push("block trade structure — common institutional execution method"); }
  if (isCombo) { institutionalScore += 15; institutionalReasons.push("multi-leg combo — retail rarely constructs spreads/straddles at this size"); }
  if (dte >= 30 && dte <= 60) { institutionalScore += 5; institutionalReasons.push("30-60 DTE sweet spot often used by institutional hedgers"); }
  if (events.isEarningsPlay && !events.earningsConfirmed) { institutionalScore += 5; institutionalReasons.push("positioning before unconfirmed earnings date — potential information edge"); }

  if (dte <= 7) { institutionalScore -= 20; retailReasons.push("very short DTE — retail lottery-ticket behavior"); }
  if (totalContracts < 50) { institutionalScore -= 15; retailReasons.push("small contract count — consistent with retail sizing"); }
  if (signalType === "sweep" && totalContracts < 200) { retailReasons.push("small sweep — could be retail chasing momentum"); }

  institutionalScore = Math.max(0, Math.min(100, institutionalScore));
  const institutionalLook = institutionalScore >= 60;

  // ── Unusualness ──────────────────────────────────────────────────────────────
  let unusualness: InsightPayload["unusualness"];
  let unusualnessReason: string;

  if (totalScore >= 85) {
    unusualness = "extreme";
    unusualnessReason = `Score of ${totalScore}/100 is in the top 1% of signals — this is extremely rare`;
  } else if (totalScore >= 70) {
    unusualness = "unusual";
    unusualnessReason = `Score of ${totalScore}/100 — well above the noteworthy threshold of 65`;
  } else if (totalScore >= 55) {
    unusualness = "noteworthy";
    unusualnessReason = `Score of ${totalScore}/100 — elevated vs normal flow but not extreme`;
  } else {
    unusualness = "routine";
    unusualnessReason = `Score of ${totalScore}/100 — borderline; worth tracking but not high conviction`;
  }

  // ── Direction summary ────────────────────────────────────────────────────────
  const directionSummary = isNeutral
    ? `Volatility play — positioned for a large move in either direction`
    : isBullish
    ? `Bullish — ${isCall ? "call buying" : "put selling"} suggests expectation of ${symbol} moving higher`
    : `Bearish — ${isPut ? "put buying" : "call selling"} suggests expectation of ${symbol} declining`;

  // ── One-liner ────────────────────────────────────────────────────────────────
  const oneLiner = buildOneLiner(input, events, themes, peers);

  return {
    whatTheyMayBeBettingOn,
    whyInterestingNow,
    whatCouldInvalidate,
    isKnownCatalyst: events.hasKnownCatalyst,
    catalystDescription: events.hasKnownCatalyst ? events.nearestEventName : undefined,
    earningsWithinExpiry: events.earningsBeforeExpiry,
    unusualness,
    unusualnessReason,
    institutionalLook,
    institutionalScore,
    institutionalReasons,
    retailReasons,
    directionSummary,
    oneLiner,
  };
}

function buildOneLiner(
  input: InsightInput,
  events: EventEnrichment,
  themes: ThemeEnrichment,
  peers: PeerEnrichment,
): string {
  const { symbol, direction, totalPremium, totalContracts, dte, signalType } = input;
  const dir = direction === "bullish" ? "🟢" : direction === "bearish" ? "🔴" : "🟡";
  const typeLabel = signalType.toUpperCase().replace("_", " ");
  const premium = formatPremium(totalPremium);

  if (events.isEarningsPlay) {
    return `${dir} ${symbol} ${typeLabel} — ${premium} / ${totalContracts.toLocaleString()} cts | Earnings in ${events.daysToEarnings}d | ${dte}DTE`;
  }
  if (events.isFdaPlay) {
    return `${dir} ${symbol} ${typeLabel} — ${premium} / ${totalContracts.toLocaleString()} cts | FDA in ${events.daysToFda}d | ${dte}DTE`;
  }
  if (themes.primaryCluster && themes.primaryCluster.activeMembers.length >= 2) {
    return `${dir} ${symbol} ${typeLabel} — ${premium} | ${themes.primaryThemeName} cluster (${themes.primaryCluster.activeMembers.length} names)`;
  }
  if (peers.activePeerSymbols.length >= 2) {
    return `${dir} ${symbol} ${typeLabel} — ${premium} | Peer sync: ${peers.activePeerSymbols.slice(0, 2).join("+")}`;
  }
  return `${dir} ${symbol} ${typeLabel} — ${premium} / ${totalContracts.toLocaleString()} cts | ${dte}DTE`;
}

function formatPremium(p: number): string {
  if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(2)}M`;
  if (p >= 1_000)     return `$${(p / 1_000).toFixed(0)}K`;
  return `$${p}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function currentQuarter(): number {
  const m = new Date().getMonth();
  return Math.floor(m / 3) + 1;
}
