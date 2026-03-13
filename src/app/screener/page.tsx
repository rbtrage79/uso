"use client";

import { useState } from "react";
import {
  TrendingUp, TrendingDown, Zap, Search, Filter,
  FlaskConical, Layers, SlidersHorizontal, BookOpen,
} from "lucide-react";
import { TopListTable } from "@/components/screener/top-list-table";
import { ThemeClusterCard } from "@/components/screener/theme-cluster-card";
import {
  MOCK_TOP_CALLS,
  MOCK_TOP_PUTS,
  MOCK_IV_SPIKES,
  MOCK_NO_EVENT,
  MOCK_BIOTECH_CATALYSTS,
  MOCK_THEME_CLUSTERS,
  MOCK_FACTOR_CLUSTERS,
} from "@/data/mock-screener";
import { formatDollar, cn } from "@/lib/utils/formatting";

// ── Tab definitions ────────────────────────────────────────────────────────────

const TABS = [
  { id: "calls",    label: "Top Calls",   icon: TrendingUp,    color: "text-bull" },
  { id: "puts",     label: "Top Puts",    icon: TrendingDown,  color: "text-bear" },
  { id: "iv",       label: "IV Spikes",   icon: Zap,           color: "text-signal-gold" },
  { id: "noevent",  label: "No-Event",    icon: Search,        color: "text-sky-400" },
  { id: "themes",   label: "Themes",      icon: Layers,        color: "text-signal-purple" },
  { id: "factors",  label: "Factors",     icon: SlidersHorizontal, color: "text-teal-400" },
  { id: "biotech",  label: "Biotech",     icon: FlaskConical,  color: "text-rose-400" },
] as const;

type TabId = typeof TABS[number]["id"];

// ── Stat strip ─────────────────────────────────────────────────────────────────

interface StatStripProps {
  count: number;
  totalPremium: number;
  avgScore: number;
  topSymbol?: string;
}

function StatStrip({ count, totalPremium, avgScore, topSymbol }: StatStripProps) {
  return (
    <div className="flex items-center gap-6 px-4 py-2.5 bg-surface-raised border border-surface-border rounded-lg text-xs">
      <div>
        <span className="text-zinc-500">Signals</span>
        <p className="text-white font-bold font-mono">{count}</p>
      </div>
      <div>
        <span className="text-zinc-500">Total Premium</span>
        <p className="text-signal-gold font-bold font-mono">{formatDollar(totalPremium)}</p>
      </div>
      <div>
        <span className="text-zinc-500">Avg Score</span>
        <p className="text-white font-bold font-mono">{avgScore.toFixed(0)}</p>
      </div>
      {topSymbol && (
        <div>
          <span className="text-zinc-500">Top Symbol</span>
          <p className="text-white font-bold font-mono">{topSymbol}</p>
        </div>
      )}
    </div>
  );
}

// ── Factor cluster card ────────────────────────────────────────────────────────

import type { FactorCluster } from "@/types/features";

function FactorClusterCard({ cluster }: { cluster: FactorCluster }) {
  const bullCount = cluster.signals.filter((s) => s.direction === "bullish").length;
  const bearCount = cluster.signals.filter((s) => s.direction === "bearish").length;
  const total = cluster.signals.length || 1;
  const bullPct = (bullCount / total) * 100;
  const bearPct = (bearCount / total) * 100;

  const dirColor =
    cluster.dominantDirection === "bullish" ? "text-bull"
    : cluster.dominantDirection === "bearish" ? "text-bear"
    : "text-amber-400";

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised p-4 space-y-3 hover:border-zinc-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-white">{cluster.factorName}</p>
          <p className="text-xs text-zinc-500">{cluster.description}</p>
        </div>
        <span className={cn("text-xs font-semibold capitalize", dirColor)}>
          {cluster.dominantDirection}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs">
        <div>
          <span className="text-zinc-500">Signals</span>
          <p className="text-white font-bold font-mono">{cluster.signals.length}</p>
        </div>
        <div>
          <span className="text-zinc-500">Premium</span>
          <p className="text-signal-gold font-bold font-mono">{formatDollar(cluster.totalPremium)}</p>
        </div>
        <div>
          <span className="text-zinc-500">Avg Score</span>
          <p className="text-white font-bold font-mono">{cluster.avgScore.toFixed(0)}</p>
        </div>
      </div>

      {/* Direction bar */}
      <div className="space-y-1">
        <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-muted gap-px">
          <div className="bg-bull/70 transition-all" style={{ width: `${bullPct}%` }} />
          <div className="bg-bear/70 transition-all" style={{ width: `${bearPct}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>Bull {bullCount}</span>
          <span>Bear {bearCount}</span>
        </div>
      </div>

      {/* Top symbols */}
      <div className="flex flex-wrap gap-1">
        {cluster.topSymbols.slice(0, 5).map((sym) => (
          <span
            key={sym}
            className="px-1.5 py-0.5 rounded bg-surface-muted border border-surface-border text-[11px] font-mono text-zinc-300"
          >
            {sym}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ScreenerPage() {
  const [activeTab, setActiveTab] = useState<TabId>("calls");

  const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  // Derive stats for current tab
  const tabData = {
    calls:   MOCK_TOP_CALLS,
    puts:    MOCK_TOP_PUTS,
    iv:      MOCK_IV_SPIKES,
    noevent: MOCK_NO_EVENT,
    themes:  [],
    factors: [],
    biotech: MOCK_BIOTECH_CATALYSTS,
  };

  const currentItems = tabData[activeTab] ?? [];
  const totalPremium = currentItems.reduce((sum, it) => sum + it.signal.totalPremium, 0);
  const avgScore = currentItems.length
    ? currentItems.reduce((sum, it) => sum + it.signal.totalScore, 0) / currentItems.length
    : 0;
  const topSymbol = currentItems[0]?.signal.symbol;

  return (
    <div className="max-w-screen-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-signal-cyan" />
            <h1 className="text-2xl font-bold text-white">Signal Screener</h1>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            Ranked unusual flow across 7 category lenses
          </p>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <p>Last updated: <span className="text-zinc-300">{now}</span></p>
          <p className="text-zinc-600">Mock data · real-time in prod</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {TABS.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
              activeTab === id
                ? "bg-surface-raised border-zinc-600 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-surface-muted",
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", activeTab === id ? color : "")} />
            {label}
          </button>
        ))}
      </div>

      {/* Stat strip for list tabs */}
      {activeTab !== "themes" && activeTab !== "factors" && (
        <StatStrip
          count={currentItems.length}
          totalPremium={totalPremium}
          avgScore={avgScore}
          topSymbol={topSymbol}
        />
      )}

      {/* Tab content */}
      {activeTab === "calls" && <TopListTable items={MOCK_TOP_CALLS} />}
      {activeTab === "puts"  && <TopListTable items={MOCK_TOP_PUTS} />}
      {activeTab === "iv"    && <TopListTable items={MOCK_IV_SPIKES} />}
      {activeTab === "noevent" && <TopListTable items={MOCK_NO_EVENT} />}
      {activeTab === "biotech" && <TopListTable items={MOCK_BIOTECH_CATALYSTS} />}

      {activeTab === "themes" && (
        <div>
          {/* Theme stat strip */}
          <div className="flex items-center gap-6 px-4 py-2.5 mb-4 bg-surface-raised border border-surface-border rounded-lg text-xs">
            <div>
              <span className="text-zinc-500">Theme Clusters</span>
              <p className="text-white font-bold font-mono">{MOCK_THEME_CLUSTERS.length}</p>
            </div>
            <div>
              <span className="text-zinc-500">Total Premium</span>
              <p className="text-signal-gold font-bold font-mono">
                {formatDollar(MOCK_THEME_CLUSTERS.reduce((s, t) => s + t.totalPremium, 0))}
              </p>
            </div>
            <div>
              <span className="text-zinc-500">Total Signals</span>
              <p className="text-white font-bold font-mono">
                {MOCK_THEME_CLUSTERS.reduce((s, t) => s + t.signals.length, 0)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {MOCK_THEME_CLUSTERS.map((cluster) => (
              <ThemeClusterCard key={cluster.themeName} cluster={cluster} />
            ))}
          </div>
        </div>
      )}

      {activeTab === "factors" && (
        <div>
          {/* Factor stat strip */}
          <div className="flex items-center gap-6 px-4 py-2.5 mb-4 bg-surface-raised border border-surface-border rounded-lg text-xs">
            <div>
              <span className="text-zinc-500">Factor Clusters</span>
              <p className="text-white font-bold font-mono">{MOCK_FACTOR_CLUSTERS.length}</p>
            </div>
            <div>
              <span className="text-zinc-500">Total Premium</span>
              <p className="text-signal-gold font-bold font-mono">
                {formatDollar(MOCK_FACTOR_CLUSTERS.reduce((s, f) => s + f.totalPremium, 0))}
              </p>
            </div>
            <div>
              <span className="text-zinc-500">Total Signals</span>
              <p className="text-white font-bold font-mono">
                {MOCK_FACTOR_CLUSTERS.reduce((s, f) => s + f.signals.length, 0)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {MOCK_FACTOR_CLUSTERS.map((fc) => (
              <FactorClusterCard key={fc.factorName} cluster={fc} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
