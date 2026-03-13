import type { DirectionType, UnusualnessTier } from "@/types/feed";

export interface ExplainInput {
  symbol: string;
  companyName: string;
  direction: DirectionType;
  signalLabel: string;
  optionType: "call" | "put" | "mixed";
  strike: number;
  expiration: string;
  dte: number;
  contracts: number;
  premium: number;
  volOiRatio: number;
  impliedVol: number;
  delta?: number;
  totalScore: number;
  noveltyScore: number;
  unusualness: UnusualnessTier;
  hasKnownCatalyst: boolean;
  nearestEventLabel?: string;
  daysToNearestEvent?: number;
  earningsWithinExpiry: boolean;
  primaryTheme?: string;
  activePeers: string[];
  isCombo: boolean;
  institutionalScore: number;
}

export interface Explanations {
  tweetShort: string;
  retailPlain: string;
  traderPro: string;
}

function fmtM(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

function fmtContracts(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;
}

function dirEmoji(dir: DirectionType): string {
  return dir === "bullish" ? "🟢" : dir === "bearish" ? "🔴" : "🟡";
}

function dirWord(dir: DirectionType, optType: string): string {
  if (dir === "bullish") return optType === "put" ? "put selling / synthetically bullish" : "call buying";
  if (dir === "bearish") return optType === "call" ? "call selling / bearish" : "put buying";
  return "neutral positioning";
}

function catalystNote(input: ExplainInput): string {
  if (input.earningsWithinExpiry) return ` Earnings fall within the expiry window.`;
  if (input.nearestEventLabel && input.daysToNearestEvent !== undefined) {
    return ` ${input.nearestEventLabel} is in ${input.daysToNearestEvent}d.`;
  }
  if (!input.hasKnownCatalyst) return ` No known catalyst — pure novelty/insider-type behavior.`;
  return "";
}

function peerNote(input: ExplainInput): string {
  if (input.activePeers.length >= 2) return ` ${input.activePeers.length} peer names also showing unusual flow (${input.activePeers.slice(0, 3).join(", ")}).`;
  if (input.activePeers.length === 1) return ` ${input.activePeers[0]} also seeing activity.`;
  return "";
}

export function generateExplanations(input: ExplainInput): Explanations {
  const {
    symbol, signalLabel, optionType, strike, expiration, dte,
    contracts, premium, volOiRatio, impliedVol, delta, direction,
    totalScore, noveltyScore, unusualness, primaryTheme,
    institutionalScore,
  } = input;

  const iv = Math.round(impliedVol * 100);
  const pricePerContract = premium / contracts / 100;
  const sizeWord = contracts >= 5000 ? "whale-sized" : contracts >= 2000 ? "institutional-sized" : "noteworthy";
  const unusualnessAdj = { routine: "typical", noteworthy: "elevated", unusual: "highly unusual", extreme: "extraordinary" }[unusualness];

  // ── 1. Tweet-short ──────────────────────────────────────────────────────
  const evt = input.nearestEventLabel
    ? ` ${input.nearestEventLabel?.split(" ").slice(0, 2).join(" ")} ${input.daysToNearestEvent}d.`
    : input.earningsWithinExpiry ? " Earnings inside expiry." : "";
  const tweetShort = `${dirEmoji(direction)} $${symbol} ${signalLabel} — ${fmtContracts(contracts)} ${optionType}s @$${strike} ${expiration}. ${fmtM(premium)} premium. ${volOiRatio.toFixed(1)}x vol/OI. Score ${totalScore}.${evt}`;

  // ── 2. Retail plain English ──────────────────────────────────────────────
  const sizeDesc = premium >= 2_000_000 ? "massive" : premium >= 1_000_000 ? "large" : "notable";
  const themeStr = primaryTheme ? ` in the ${primaryTheme} space` : "";
  const peerStr = input.activePeers.length >= 2
    ? ` Several related names (${input.activePeers.slice(0, 2).join(", ")}) are also seeing unusual activity, suggesting this may be part of a coordinated theme bet.`
    : "";
  const catalystStr = input.earningsWithinExpiry
    ? ` Notably, earnings fall before this option expires — so this bet captures the next earnings report.`
    : input.nearestEventLabel
      ? ` There's a ${input.nearestEventLabel} in ${input.daysToNearestEvent} days that could act as the catalyst.`
      : !input.hasKnownCatalyst
        ? ` There's no obvious upcoming event to explain this, which makes it more intriguing — sometimes that's a signal in itself.`
        : "";

  const retailPlain =
    `A ${sizeDesc} ${direction} ${optionType === "mixed" ? "options" : optionType} ${signalLabel.toLowerCase()} just hit ${input.companyName}${themeStr} at the $${strike} strike expiring ${expiration} (${dte} days out). ` +
    `${fmtContracts(contracts)} contracts traded for ${fmtM(premium)} in premium — that's ${volOiRatio.toFixed(1)}× the open interest, meaning new money is coming in, not just closing old positions.` +
    `${catalystStr}${peerStr}`;

  // ── 3. Trader-pro ────────────────────────────────────────────────────────
  const deltaStr = delta !== undefined ? ` δ${delta.toFixed(2)}` : "";
  const instStr = institutionalScore >= 75 ? "Institutional fingerprint likely." : institutionalScore >= 50 ? "Mixed retail/institutional." : "Retail-sized positioning.";
  const novelStr = noveltyScore >= 70 ? "High novelty — not consistent with recent pattern." : noveltyScore >= 50 ? "Moderate novelty." : "Low novelty — consistent with recent flow.";
  const otmPct = delta !== undefined && delta < 0.4 ? ` OTM (${Math.round((1 - delta) * 100)}% OTM by delta heuristic).` : "";

  const traderPro =
    `${signalLabel} in ${symbol} ${optionType}s: $${strike} strike, ${expiration} expiry (${dte} DTE), ${contracts.toLocaleString()} contracts for ${fmtM(premium)} notional (~$${pricePerContract.toFixed(2)}/contract). ` +
    `Vol/OI: ${volOiRatio.toFixed(1)}×. IV: ${iv}%.${deltaStr}.${otmPct} ` +
    `Score: ${totalScore}/100 (${unusualnessAdj}). ${instStr} ${novelStr}${catalystNote(input)}${peerNote(input)} ` +
    `${dirWord(direction, optionType)} posture — watch for follow-through.`;

  return { tweetShort, retailPlain, traderPro };
}
