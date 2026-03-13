/**
 * Converts a FullyEnrichedSignal into a FeedPost for the display layer.
 * Used in production when signals come from the enrichment pipeline.
 */

import type { FullyEnrichedSignal } from "@/lib/enrichment/signal-enricher";
import type { FeedPost, EventBadge, FeedPostLeg, DirectionType } from "@/types/feed";
import { generateTags } from "./tag-generator";
import { generateExplanations } from "./explanation-generator";
import { nanoid } from "nanoid";

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(iso: string, now = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (rem === 0) return `${h}h ago`;
  return `${h}h ${rem}m ago`;
}

function sparklineFromTrend(trend: "up" | "down" | "flat"): number[] {
  if (trend === "up")   return [0.40,0.42,0.41,0.44,0.46,0.45,0.48,0.50,0.49,0.52,0.54,0.53,0.56,0.58,0.57,0.60,0.62,0.61,0.65,0.68];
  if (trend === "down") return [0.65,0.63,0.64,0.61,0.59,0.62,0.58,0.56,0.59,0.55,0.53,0.56,0.52,0.50,0.48,0.51,0.47,0.45,0.43,0.40];
  return [0.50,0.51,0.49,0.52,0.50,0.48,0.51,0.50,0.52,0.49,0.51,0.50,0.48,0.51,0.50,0.52,0.49,0.51,0.50,0.51];
}

const EVENT_EMOJI: Record<string, string> = {
  earnings: "📊", fda: "💊", fda_pdufa: "💊", fda_adcom: "💊",
  fomc: "🏛️", cpi: "📈", ppi: "📈", nfp: "👷", gdp: "📊",
  opex: "⏰", quarterly_opex: "⏰", turn_of_month: "🗓️", macro: "🌐",
};

export function buildFeedPost(signal: FullyEnrichedSignal, now = new Date()): FeedPost {
  const { payload, events, peers, themes, factors, insights, ranking } = signal;
  const primaryLeg = payload.legs[0];

  const direction: DirectionType =
    payload.direction === "mixed" ? "neutral" : payload.direction as DirectionType;
  const isCombo = payload.isCombo;
  const signalKind = payload.signalType as FeedPost["signalKind"];
  const SIGNAL_LABELS: Record<string, string> = {
    sweep:                "Sweep",
    block:                "Block",
    single_leg:           "Single",
    repeat_sweep:         "Repeat Sweep",
    combo_spread:         "Combo Spread",
    combo_straddle:       "Straddle",
    combo_risk_reversal:  "Risk Reversal",
    combo_other:          "Combo",
  };
  const signalLabel = SIGNAL_LABELS[payload.signalType] ?? "Signal";

  const expIso = primaryLeg?.expirationDate?.toISOString() ?? "";
  const expLabel = expIso ? formatExpiry(expIso) : "—";
  const dte = primaryLeg?.dte ?? 30;
  const iv = primaryLeg?.impliedVol ?? 0;
  const delta = primaryLeg?.delta;

  // Build event badges
  const eventBadges: EventBadge[] = events.events.map((ev) => ({
    type: (ev.eventType?.replace("fda_pdufa","fda").replace("fda_adcom","fda") ?? "macro") as EventBadge["type"],
    label: ev.name.length > 30 ? ev.name.slice(0, 30) + "…" : ev.name,
    daysAway: ev.daysAway,
    importance: ev.importance as EventBadge["importance"],
    beforeExpiry: ev.beforeExpiry,
    emoji: EVENT_EMOJI[ev.eventType ?? ""] ?? "📅",
  }));

  // Build legs
  const legs: FeedPostLeg[] = payload.legs.map((l) => ({
    optionType: l.optionType as "call" | "put",
    strike: l.strike,
    expiration: formatExpiry(l.expirationDate.toISOString()),
    expirationISO: l.expirationDate.toISOString(),
    dte: l.dte,
    side: l.side as "buy" | "sell",
    contracts: l.quantity,
    premium: l.premium,
    impliedVol: l.impliedVol ?? 0,
    delta: l.delta,
  }));

  const optionType: "call" | "put" | "mixed" =
    isCombo ? "mixed"
    : (primaryLeg?.optionType as "call" | "put") ?? "call";

  const sparklineTrend: "up" | "down" | "flat" =
    direction === "bullish" ? "up" : direction === "bearish" ? "down" : "flat";

  const detectedAt = now.toISOString();

  const post: Omit<FeedPost, "tags"> & { tags?: string[] } = {
    id: nanoid(),
    symbol: payload.symbol,
    companyName: payload.symbol, // would come from sector-map in production
    sector: peers.sector,
    industry: peers.industry,
    signalKind,
    signalLabel,
    direction,
    isCombo,
    legs,
    optionType,
    strike: primaryLeg?.strike ?? 0,
    expiration: expLabel,
    expirationISO: expIso,
    dte,
    contracts: payload.totalContracts,
    premium: payload.totalPremium,
    volOiRatio: primaryLeg?.openInterest
      ? payload.totalContracts / primaryLeg.openInterest
      : 1,
    openInterest: primaryLeg?.openInterest ?? 0,
    impliedVol: iv,
    delta,
    underlyingPrice: payload.underlyingPrice,
    totalScore: payload.totalScore,
    feedScore: ranking.feedScore,
    noveltyScore: payload.scoreNovelty ?? 0,
    institutionalScore: insights.institutionalScore ?? 0,
    confidence: payload.confidence ?? 0,
    unusualness: insights.unusualness,
    hasKnownCatalyst: events.hasKnownCatalyst,
    events: eventBadges,
    nearestEventLabel: events.nearestEventName ?? undefined,
    daysToNearestEvent: events.daysToNearestEvent ?? undefined,
    earningsWithinExpiry: events.earningsBeforeExpiry,
    primaryTheme: themes.primaryThemeName,
    primaryThemeEmoji: themes.primaryCluster?.themeEmoji,
    primaryFactor: factors.primaryRotation?.factorName,
    primaryFactorEmoji: factors.primaryRotation?.factorEmoji,
    activePeers: peers.activePeerSymbols,
    etfMembership: peers.etfMembership,
    explanations: generateExplanations({
      symbol: payload.symbol,
      companyName: payload.symbol,
      direction,
      signalLabel,
      optionType,
      strike: primaryLeg?.strike ?? 0,
      expiration: expLabel,
      dte,
      contracts: payload.totalContracts,
      premium: payload.totalPremium,
      volOiRatio: 1,
      impliedVol: iv,
      delta,
      totalScore: payload.totalScore,
      noveltyScore: payload.scoreNovelty ?? 0,
      unusualness: insights.unusualness,
      hasKnownCatalyst: events.hasKnownCatalyst,
      nearestEventLabel: events.nearestEventName ?? undefined,
      daysToNearestEvent: events.daysToNearestEvent ?? undefined,
      earningsWithinExpiry: events.earningsBeforeExpiry,
      primaryTheme: themes.primaryThemeName,
      activePeers: peers.activePeerSymbols,
      isCombo,
      institutionalScore: insights.institutionalScore ?? 0,
    }),
    oneLiner: insights.oneLiner,
    detectedAt,
    timeAgo: timeAgo(detectedAt, now),
    sparklineData: sparklineFromTrend(sparklineTrend),
    sparklineTrend,
  };

  post.tags = generateTags({
    symbol: post.symbol,
    direction: post.direction,
    signalKind: post.signalKind,
    isCombo: post.isCombo,
    optionType: post.optionType,
    dte: post.dte,
    impliedVol: post.impliedVol,
    volOiRatio: post.volOiRatio,
    contracts: post.contracts,
    premium: post.premium,
    totalScore: post.totalScore,
    unusualness: post.unusualness,
    hasKnownCatalyst: post.hasKnownCatalyst,
    noveltyScore: post.noveltyScore,
    earningsWithinExpiry: post.earningsWithinExpiry,
    events: post.events,
    primaryTheme: post.primaryTheme,
    primaryFactor: post.primaryFactor,
    activePeers: post.activePeers,
    detectedAt: post.detectedAt,
    etfMembership: post.etfMembership,
  });

  return post as FeedPost;
}
