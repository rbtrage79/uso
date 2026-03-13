"use client";

import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils/formatting";

const DIRECTIONS = [
  { value: "all",     label: "All" },
  { value: "bullish", label: "🟢 Bull" },
  { value: "bearish", label: "🔴 Bear" },
  { value: "neutral", label: "🟡 Neutral" },
];

const SIGNAL_TYPES = [
  { value: "all",             label: "All Types" },
  { value: "sweep",           label: "Sweep" },
  { value: "block",           label: "Block" },
  { value: "repeat_sweep",    label: "Rep. Sweep" },
  { value: "combo_spread",    label: "Spread" },
  { value: "combo_straddle",  label: "Straddle" },
];

const SCORE_PRESETS = [
  { value: 0,  label: "Any" },
  { value: 55, label: "55+" },
  { value: 65, label: "65+" },
  { value: 75, label: "75+" },
  { value: 85, label: "85+" },
];

export function FilterBar() {
  const { filters, updateFilters, resetFilters } = useAppStore();

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-surface-raised rounded-lg border border-surface-border text-xs">
      {/* Direction */}
      <div className="flex items-center gap-1">
        {DIRECTIONS.map((d) => (
          <button
            key={d.value}
            onClick={() => updateFilters({ direction: d.value as "all" })}
            className={cn(
              "px-2.5 py-1 rounded font-medium transition-colors",
              filters.direction === d.value
                ? "bg-signal-cyan text-black"
                : "bg-surface-muted text-zinc-400 hover:text-zinc-200",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-surface-border" />

      {/* Signal type */}
      <select
        value={filters.signalType ?? "all"}
        onChange={(e) => updateFilters({ signalType: e.target.value as "all" })}
        className="bg-surface-muted border border-surface-border text-zinc-300 rounded px-2 py-1 text-xs"
      >
        {SIGNAL_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Min score */}
      <div className="flex items-center gap-1">
        <span className="text-zinc-500">Score:</span>
        {SCORE_PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => updateFilters({ minScore: p.value })}
            className={cn(
              "px-2 py-1 rounded transition-colors",
              (filters.minScore ?? 0) === p.value
                ? "bg-signal-gold/20 text-signal-gold border border-signal-gold/30"
                : "text-zinc-400 hover:text-zinc-200",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Min premium */}
      <div className="flex items-center gap-1">
        <span className="text-zinc-500">Min Premium:</span>
        <select
          value={filters.minPremium ?? 50_000}
          onChange={(e) => updateFilters({ minPremium: parseInt(e.target.value) })}
          className="bg-surface-muted border border-surface-border text-zinc-300 rounded px-2 py-1 text-xs"
        >
          <option value={25_000}>$25K</option>
          <option value={50_000}>$50K</option>
          <option value={100_000}>$100K</option>
          <option value={250_000}>$250K</option>
          <option value={500_000}>$500K</option>
          <option value={1_000_000}>$1M</option>
        </select>
      </div>

      {/* Max DTE */}
      <div className="flex items-center gap-1">
        <span className="text-zinc-500">Max DTE:</span>
        <select
          value={filters.maxDte ?? 90}
          onChange={(e) => updateFilters({ maxDte: parseInt(e.target.value) })}
          className="bg-surface-muted border border-surface-border text-zinc-300 rounded px-2 py-1 text-xs"
        >
          <option value={7}>7</option>
          <option value={14}>14</option>
          <option value={30}>30</option>
          <option value={60}>60</option>
          <option value={90}>90</option>
        </select>
      </div>

      <div className="flex-1" />

      <button
        onClick={resetFilters}
        className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
      >
        Reset
      </button>
    </div>
  );
}
