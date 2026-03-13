/**
 * Feed Formatter — converts a DetectedSignalPayload into a Twitter-like FeedPost.
 * Generates a punchy headline + retail-friendly explanation.
 */

import type { DetectedSignalPayload, FeedPostPayload } from "@/types/signals";
import { formatPremium } from "@/lib/utils/options-math";
import { DETECTION_CONFIG as CFG } from "@/lib/detection/config";

const DIRECTION_EMOJI = {
  bullish: "🟢",
  bearish: "🔴",
  neutral: "🟡",
  mixed: "🔵",
} as const;

const SIGNAL_TYPE_LABEL = {
  single_leg: "Single Leg",
  sweep: "Sweep",
  block: "Block Trade",
  repeat_sweep: "Repeat Sweep",
  combo_spread: "Spread",
  combo_straddle: "Straddle/Strangle",
  combo_risk_reversal: "Risk Reversal",
  combo_other: "Combo",
} as const;

const DIRECTION_LABEL = {
  bullish: "BULLISH",
  bearish: "BEARISH",
  neutral: "NEUTRAL",
  mixed: "MIXED",
} as const;

/**
 * Build a headline for the signal.
 * e.g. "🟢 AAPL — $1.2M Bullish Sweep"
 */
function buildHeadline(signal: DetectedSignalPayload): string {
  const leg = signal.legs[0];
  const emoji = DIRECTION_EMOJI[signal.direction] ?? "⚪";
  const typeLabel = SIGNAL_TYPE_LABEL[signal.signalType] ?? "Trade";
  const premium = formatPremium(signal.totalPremium);
  const dir = DIRECTION_LABEL[signal.direction];

  if (leg) {
    const strike = leg.strike;
    const exp = leg.expirationDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const cp = leg.optionType === "call" ? "C" : "P";
    return `${emoji} ${signal.symbol} — ${premium} ${dir} ${typeLabel} | ${strike}${cp} ${exp} | Score ${signal.totalScore}`;
  }

  return `${emoji} ${signal.symbol} — ${premium} ${dir} ${typeLabel}`;
}

/**
 * Build a retail-friendly explanation body.
 */
function buildBody(signal: DetectedSignalPayload): string {
  const leg = signal.legs[0];
  const premium = formatPremium(signal.totalPremium);
  const contracts = signal.totalContracts.toLocaleString();
  const lines: string[] = [];

  // Opening line
  if (signal.direction === "bullish") {
    lines.push(
      `Someone just paid ${premium} for ${contracts} contracts betting ${signal.symbol} goes UP.`,
    );
  } else if (signal.direction === "bearish") {
    lines.push(
      `${premium} in bearish options just hit ${signal.symbol} — ${contracts} contracts betting on a DROP.`,
    );
  } else {
    lines.push(
      `Unusual ${SIGNAL_TYPE_LABEL[signal.signalType]} activity on ${signal.symbol}: ${premium} across ${contracts} contracts.`,
    );
  }

  // Leg detail
  if (leg) {
    const cp = leg.optionType === "call" ? "calls" : "puts";
    const exp = leg.expirationDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const ivStr = leg.impliedVol != null ? ` (IV ${(leg.impliedVol * 100).toFixed(0)}%)` : "";
    lines.push(`Strike: $${leg.strike} ${cp}${ivStr} expiring ${exp} (${leg.dte}DTE)`);
  }

  // Context line
  if (signal.daysToNearestEvent != null && signal.nearestEventType) {
    const evLabel = {
      earnings: "earnings",
      fda: "an FDA catalyst",
      macro: "a major macro event",
    }[signal.nearestEventType] ?? "an event";
    lines.push(
      `⚡ ${signal.daysToNearestEvent}d to ${evLabel} — this bet expires ${signal.daysToNearestEvent < 7 ? "right around" : "near"} the catalyst.`,
    );
  } else if (signal.scoreNovelty && signal.scoreNovelty > 60) {
    lines.push("❓ No known catalyst — this could be informed flow or a dark-pool position.");
  }

  // Score breakdown
  if (signal.totalScore >= CFG.minScoreToPublish) {
    lines.push(
      `Signal score: ${signal.totalScore}/100 (confidence: ${(signal.confidence * 100).toFixed(0)}%)`,
    );
  }

  return lines.join("\n");
}

/**
 * Build hashtag/cashtag array.
 */
function buildTags(signal: DetectedSignalPayload): string[] {
  const tags: string[] = [`$${signal.symbol}`, "#UnusualOptions"];

  if (signal.direction === "bullish") tags.push("#Bullish");
  if (signal.direction === "bearish") tags.push("#Bearish");

  if (signal.signalType === "sweep" || signal.signalType === "repeat_sweep") {
    tags.push("#Sweep");
  }
  if (signal.isCombo) tags.push("#Combo");
  if (signal.nearestEventType === "earnings") tags.push("#Earnings");
  if (signal.nearestEventType === "fda") tags.push("#FDA");
  if (signal.totalScore >= 80) tags.push("#HighConviction");

  return tags;
}

/**
 * Format a signal into a publishable FeedPost payload.
 */
export function formatSignalPost(
  signal: DetectedSignalPayload,
  signalId: string,
): FeedPostPayload {
  const emoji = DIRECTION_EMOJI[signal.direction] ?? "⚪";

  return {
    signalId,
    headline: buildHeadline(signal),
    body: buildBody(signal),
    emoji,
    direction: signal.direction,
    totalScore: signal.totalScore,
    premium: signal.totalPremium,
    tags: buildTags(signal),
  };
}
