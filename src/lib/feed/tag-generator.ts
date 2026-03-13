import type { FeedPost } from "@/types/feed";

type TagInput = Pick<
  FeedPost,
  | "symbol" | "direction" | "signalKind" | "isCombo" | "optionType"
  | "dte" | "impliedVol" | "volOiRatio" | "contracts" | "premium"
  | "unusualness" | "hasKnownCatalyst" | "noveltyScore"
  | "earningsWithinExpiry" | "events" | "primaryTheme"
  | "primaryFactor" | "activePeers" | "detectedAt" | "etfMembership"
  | "totalScore"
>;

function etHour(iso: string): number {
  const d = new Date(iso);
  // ET = UTC-5 (ignoring DST for simplicity)
  return (d.getUTCHours() - 5 + 24) % 24 + d.getUTCMinutes() / 60;
}

export function generateTags(s: TagInput): string[] {
  const tags: string[] = [];

  // ── Ticker ────────────────────────────────────────────────────────────────
  tags.push(`$${s.symbol}`);

  // ── DTE bucket ────────────────────────────────────────────────────────────
  if (s.dte <= 7)        tags.push("0-7DTE");
  else if (s.dte <= 14)  tags.push("14DTE");
  else if (s.dte <= 30)  tags.push("30DTE");
  else if (s.dte <= 60)  tags.push("60DTE");
  else                   tags.push("90DTE+");

  // ── Signal type ───────────────────────────────────────────────────────────
  if (s.signalKind === "sweep" || s.signalKind === "repeat_sweep") tags.push("SweepLike");
  if (s.signalKind === "block")       tags.push("BlockTrade");
  if (s.signalKind === "repeat_sweep") tags.push("RepeatSweep");
  if (s.isCombo)                      tags.push("ComboTrade");

  // ── Direction ─────────────────────────────────────────────────────────────
  if (s.direction === "bullish") tags.push("BullishFlow");
  if (s.direction === "bearish") {
    if (s.signalKind === "block") tags.push("BearishHedge");
    else tags.push("BearishFlow");
  }

  // ── IV ────────────────────────────────────────────────────────────────────
  if (s.impliedVol > 0.8) tags.push("IVSpike");

  // ── Size ──────────────────────────────────────────────────────────────────
  if (s.contracts > 5000 || s.premium > 2_000_000) tags.push("WhaleSize");

  // ── Catalyst / event ──────────────────────────────────────────────────────
  if (s.earningsWithinExpiry) tags.push("EarningsWithinExpiry");

  const hasFda  = s.events.some(e => e.type === "fda");
  const hasFomc = s.events.some(e => e.type === "fomc" && e.daysAway <= 7);
  const hasOpex = s.events.some(e => e.type === "opex" && e.daysAway <= 7);
  if (hasFda)  tags.push("FDAWatch");
  if (hasFomc) tags.push("FedWeek");
  if (hasOpex) tags.push("OPEXWeek");

  if (!s.hasKnownCatalyst && s.noveltyScore > 60) tags.push("NoKnownCatalyst");

  // ── Score / conviction ────────────────────────────────────────────────────
  if (s.totalScore >= 85)            tags.push("HighConviction");
  if (s.activePeers.length >= 2)     tags.push("PeerSync");
  if (s.volOiRatio > 5)              tags.push("VolOISpike");

  // ── Theme ─────────────────────────────────────────────────────────────────
  const themeTagMap: Record<string, string> = {
    "AI Infrastructure":   "AITheme",
    "AI Software":         "AITheme",
    "Semiconductors":      "SemiPlay",
    "SaaS / Cloud":        "SaaSTheme",
    "Biotech & Genomics":  "BiotechPlay",
    "GLP-1 / Obesity":     "GLP1Play",
    "Macro / Rates":       "MacroFlow",
    "Mega-Cap Tech":       "MegaCapFlow",
    "EV / Clean Energy":   "EVTheme",
    "Defense & Cyber":     "DefensePlay",
    "Digital Advertising": "AdTechFlow",
    "Cloud / Hyperscaler": "CloudTheme",
  };
  if (s.primaryTheme && themeTagMap[s.primaryTheme]) {
    tags.push(themeTagMap[s.primaryTheme]);
  }

  // ── Factor ────────────────────────────────────────────────────────────────
  if (s.primaryFactor) tags.push("FactorRotation");

  // ── ETF flow ──────────────────────────────────────────────────────────────
  if (["SPY","QQQ","IWM","XLF","XBI","XLK","XLV","SMH","SOXX"].includes(s.symbol)) {
    tags.push("ETFFlow");
  }

  // ── Time-based ────────────────────────────────────────────────────────────
  const hour = etHour(s.detectedAt);
  if (hour >= 11.5 && hour <= 13.0) tags.push("LunchHourPrint");
  if (hour >= 15.5 && hour <= 16.0) tags.push("ClosingAuction");

  return tags;
}

// Color class by tag name
export function getTagStyle(tag: string): string {
  if (tag.startsWith("$"))               return "bg-zinc-800 text-zinc-200 border-zinc-700";
  if (/DTE$/.test(tag))                  return "bg-blue-950/70 text-blue-300 border-blue-800/50";
  if (["EarningsWithinExpiry","FDAWatch","FedWeek","OPEXWeek"].includes(tag))
                                         return "bg-amber-950/70 text-amber-300 border-amber-800/50";
  if (["BullishFlow","CallSweep"].includes(tag))
                                         return "bg-emerald-950/70 text-emerald-300 border-emerald-800/50";
  if (["BearishHedge","BearishFlow","PutSweep"].includes(tag))
                                         return "bg-rose-950/70 text-rose-300 border-rose-800/50";
  if (["SweepLike","BlockTrade","ComboTrade","RepeatSweep"].includes(tag))
                                         return "bg-zinc-800/80 text-zinc-300 border-zinc-600";
  if (["AITheme","SemiPlay","SaaSTheme","BiotechPlay","GLP1Play","MacroFlow",
       "MegaCapFlow","EVTheme","DefensePlay","AdTechFlow","CloudTheme","FactorRotation"].includes(tag))
                                         return "bg-violet-950/70 text-violet-300 border-violet-800/50";
  if (["HighConviction","IVSpike","WhaleSize","PeerSync","VolOISpike","NoKnownCatalyst"].includes(tag))
                                         return "bg-orange-950/70 text-orange-300 border-orange-800/50";
  if (["ETFFlow","LunchHourPrint","ClosingAuction"].includes(tag))
                                         return "bg-cyan-950/70 text-cyan-300 border-cyan-800/50";
  return "bg-zinc-800/60 text-zinc-400 border-zinc-700/50";
}
