/**
 * Theme Enricher — detects synchronized unusual flow across thematic clusters.
 *
 * A theme cluster fires when multiple names in the same theme show unusual
 * flow in the same direction within a rolling time window.
 */

import { getThemesForSymbol, getThemeById, type ThemeBucketDef } from "@/data/theme-map";

export interface ThemeEnrichment {
  /** All themes this symbol belongs to */
  themes: ThemeBucketDef[];
  themeIds: string[];
  themeNames: string[];

  /** Detected theme clusters (themes where ≥2 members are active) */
  activeClusters: ThemeCluster[];

  /** Primary cluster (highest activity) */
  primaryCluster?: ThemeCluster;
  primaryThemeId?: string;
  primaryThemeName?: string;

  /** 0-100: overall theme synchronization signal */
  themeSyncScore: number;
}

export interface ThemeCluster {
  themeId: string;
  themeName: string;
  themeEmoji: string;
  themeColor: string;
  catalyst?: string;

  /** Active member symbols in this cluster */
  activeMembers: string[];
  totalMembers: number;
  coveragePct: number; // activeMembers / totalMembers

  /** Directional breakdown */
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  dominantDirection: "bullish" | "bearish" | "neutral" | "mixed";

  /** Cluster quality metrics */
  avgScore: number;
  totalPremium: number;
  clusterScore: number; // 0-100

  /** Same expiry cluster (more coordinated = higher conviction) */
  sameExpiryCount: number;
  sameCatalystCount: number;
}

export interface ActiveThemeSignal {
  symbol: string;
  direction: "bullish" | "bearish" | "neutral";
  totalScore: number;
  totalPremium: number;
  dte?: number;
  expiry?: string;
  eventType?: string;
}

/**
 * Detect theme clusters from a window of recent signals.
 *
 * @param symbol          - Current signal's symbol (to find its themes)
 * @param recentSignals   - All signals in the rolling detection window
 */
export function enrichThemes(
  symbol: string,
  recentSignals: ActiveThemeSignal[] = [],
): ThemeEnrichment {
  const themes = getThemesForSymbol(symbol);
  const themeIds = themes.map((t) => t.id);
  const themeNames = themes.map((t) => t.name);

  const activeClusters: ThemeCluster[] = [];

  for (const theme of themes) {
    const cluster = buildCluster(theme, recentSignals);
    if (cluster.activeMembers.length >= 1) {
      activeClusters.push(cluster);
    }
  }

  // Sort by cluster score descending
  activeClusters.sort((a, b) => b.clusterScore - a.clusterScore);
  const primaryCluster = activeClusters[0];

  // Overall theme sync score: best cluster score, boosted by # of clusters active
  const baseScore = primaryCluster?.clusterScore ?? 0;
  const multiBonus = Math.min(activeClusters.length * 5, 20);
  const themeSyncScore = Math.min(100, Math.round(baseScore + multiBonus));

  return {
    themes,
    themeIds,
    themeNames,
    activeClusters,
    primaryCluster,
    primaryThemeId: primaryCluster?.themeId,
    primaryThemeName: primaryCluster?.themeName,
    themeSyncScore,
  };
}

function buildCluster(theme: ThemeBucketDef, signals: ActiveThemeSignal[]): ThemeCluster {
  const memberSet = new Set(theme.members);
  const active = signals.filter((s) => memberSet.has(s.symbol));

  const bullishCount = active.filter((s) => s.direction === "bullish").length;
  const bearishCount = active.filter((s) => s.direction === "bearish").length;
  const neutralCount = active.filter((s) => s.direction === "neutral").length;

  let dominantDirection: ThemeCluster["dominantDirection"] = "mixed";
  if (bullishCount > 0 && bearishCount === 0 && neutralCount === 0) dominantDirection = "bullish";
  else if (bearishCount > 0 && bullishCount === 0 && neutralCount === 0) dominantDirection = "bearish";
  else if (neutralCount > 0 && bullishCount === 0 && bearishCount === 0) dominantDirection = "neutral";

  const avgScore = active.length > 0
    ? Math.round(active.reduce((s, a) => s + a.totalScore, 0) / active.length)
    : 0;
  const totalPremium = active.reduce((s, a) => s + a.totalPremium, 0);
  const coveragePct = theme.members.length > 0 ? active.length / theme.members.length : 0;

  // Same expiry cluster: signals with same expiry string
  const expiryCounts = new Map<string, number>();
  for (const sig of active) {
    if (sig.expiry) expiryCounts.set(sig.expiry, (expiryCounts.get(sig.expiry) ?? 0) + 1);
  }
  const sameExpiryCount = expiryCounts.size > 0 ? Math.max(...expiryCounts.values()) : 0;

  // Same catalyst cluster: signals tied to same event type
  const catalystCounts = new Map<string, number>();
  for (const sig of active) {
    if (sig.eventType) catalystCounts.set(sig.eventType, (catalystCounts.get(sig.eventType) ?? 0) + 1);
  }
  const sameCatalystCount = catalystCounts.size > 0 ? Math.max(...catalystCounts.values()) : 0;

  // Cluster score formula
  const coverageScore = Math.min(100, Math.round(coveragePct * 150));
  const qualityScore = avgScore;
  const sameExpiryBonus = sameExpiryCount >= 2 ? 15 : 0;
  const sameCatalystBonus = sameCatalystCount >= 2 ? 10 : 0;
  const directionBonus = dominantDirection !== "mixed" ? 10 : 0;
  const clusterScore = Math.min(
    100,
    Math.round(coverageScore * 0.5 + qualityScore * 0.35 + sameExpiryBonus + sameCatalystBonus + directionBonus),
  );

  return {
    themeId: theme.id,
    themeName: theme.name,
    themeEmoji: theme.emoji,
    themeColor: theme.color,
    catalyst: theme.catalyst,
    activeMembers: active.map((s) => s.symbol),
    totalMembers: theme.members.length,
    coveragePct,
    bullishCount, bearishCount, neutralCount,
    dominantDirection,
    avgScore, totalPremium, clusterScore,
    sameExpiryCount, sameCatalystCount,
  };
}

/** Build cluster output for a set of symbols (for /themes page) */
export function detectThemeClusters(signals: ActiveThemeSignal[]): ThemeCluster[] {
  const { THEME_BUCKETS } = require("@/data/theme-map");
  return (THEME_BUCKETS as ThemeBucketDef[])
    .map((t) => buildCluster(t, signals))
    .filter((c) => c.activeMembers.length >= 2)
    .sort((a, b) => b.clusterScore - a.clusterScore);
}
