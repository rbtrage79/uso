"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DirectionType } from "@/types/feed";

export type SortKey = "latest" | "score" | "novelty" | "premium";

export interface FeedFilterState {
  direction: DirectionType | "all";
  maxDTE: number;           // 7 | 14 | 30 | 60 | 999
  minScore: number;         // 0 | 55 | 65 | 75 | 85
  theme: string;            // "" = all
  search: string;
  sort: SortKey;
  signalKind: string;       // "" = all
}

export const DEFAULT_FILTERS: FeedFilterState = {
  direction: "all", maxDTE: 999, minScore: 0,
  theme: "", search: "", sort: "latest", signalKind: "",
};

const DTE_OPTIONS = [
  { label: "Any DTE", value: 999 },
  { label: "≤7d",     value: 7 },
  { label: "≤14d",    value: 14 },
  { label: "≤30d",    value: 30 },
  { label: "≤60d",    value: 60 },
];

const SCORE_OPTIONS = [
  { label: "Any",  value: 0 },
  { label: "55+",  value: 55 },
  { label: "65+",  value: 65 },
  { label: "75+",  value: 75 },
  { label: "85+",  value: 85 },
];

const SORT_OPTIONS: { label: string; value: SortKey }[] = [
  { label: "Latest",    value: "latest" },
  { label: "Score",     value: "score" },
  { label: "Novelty",   value: "novelty" },
  { label: "Premium",   value: "premium" },
];

const THEME_OPTIONS = [
  "AI Infrastructure", "Semiconductors", "SaaS / Cloud", "Biotech & Genomics",
  "Mega-Cap Tech", "Macro / Rates", "Defense & Cyber", "GLP-1 / Obesity",
];

interface FeedFiltersProps {
  filters: FeedFilterState;
  onChange: (f: FeedFilterState) => void;
  resultCount: number;
}

export function FeedFilters({ filters, onChange, resultCount }: FeedFiltersProps) {
  const set = <K extends keyof FeedFilterState>(key: K, val: FeedFilterState[K]) =>
    onChange({ ...filters, [key]: val });

  const hasActive =
    filters.direction !== "all" || filters.maxDTE !== 999 || filters.minScore !== 0 ||
    filters.theme !== "" || filters.search !== "" || filters.signalKind !== "";

  return (
    <div className="space-y-2">
      {/* Row 1: search + sort */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search ticker…"
            value={filters.search}
            onChange={(e) => set("search", e.target.value.toUpperCase())}
            className="w-full pl-7 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => set("search", "")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900 p-0.5 flex-shrink-0">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => set("sort", o.value)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                filters.sort === o.value
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Result count */}
        <span className="text-xs text-zinc-600 flex-shrink-0 hidden md:inline">
          {resultCount} signal{resultCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Row 2: direction + DTE + score + theme */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Direction */}
        <PillGroup>
          {(["all", "bullish", "bearish", "neutral"] as const).map((d) => (
            <PillBtn
              key={d}
              active={filters.direction === d}
              onClick={() => set("direction", d)}
              className={
                filters.direction === d && d === "bullish" ? "!text-emerald-400 !bg-emerald-900/30 !border-emerald-700/40" :
                filters.direction === d && d === "bearish" ? "!text-rose-400 !bg-rose-900/30 !border-rose-700/40" :
                filters.direction === d && d === "neutral" ? "!text-amber-400 !bg-amber-900/30 !border-amber-700/40" : ""
              }
            >
              {d === "all" ? "All" : d === "bullish" ? "🟢 Bull" : d === "bearish" ? "🔴 Bear" : "🟡 Neutral"}
            </PillBtn>
          ))}
        </PillGroup>

        {/* DTE */}
        <PillGroup>
          {DTE_OPTIONS.map((o) => (
            <PillBtn key={o.value} active={filters.maxDTE === o.value} onClick={() => set("maxDTE", o.value)}>
              {o.label}
            </PillBtn>
          ))}
        </PillGroup>

        {/* Min score */}
        <PillGroup>
          {SCORE_OPTIONS.map((o) => (
            <PillBtn key={o.value} active={filters.minScore === o.value} onClick={() => set("minScore", o.value)}>
              {o.label === "Any" ? "Any score" : o.label}
            </PillBtn>
          ))}
        </PillGroup>

        {/* Theme dropdown */}
        <select
          value={filters.theme}
          onChange={(e) => set("theme", e.target.value)}
          className="h-7 px-2 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600 cursor-pointer"
        >
          <option value="">All themes</option>
          {THEME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Reset */}
        {hasActive && (
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-800 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
          >
            <X size={11} /> Reset
          </button>
        )}
      </div>
    </div>
  );
}

function PillGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
      {children}
    </div>
  );
}

function PillBtn({
  children, active, onClick, className,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border",
        active
          ? "bg-zinc-700 text-white border-zinc-600"
          : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-300",
        className,
      )}
    >
      {children}
    </button>
  );
}
