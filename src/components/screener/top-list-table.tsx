"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { ScoreLabelBadge } from "@/components/shared/score-label-badge";
import { useAppStore } from "@/store/app-store";
import { formatDollar, formatRelativeTime, cn } from "@/lib/utils/formatting";
import { MOCK_UNDERLYINGS } from "@/data/mock-underlyings";
import type { TopListItem } from "@/types/features";

const COMPANY_MAP: Record<string, string> = Object.fromEntries(
  MOCK_UNDERLYINGS.map((u) => [u.symbol, u.name]),
);

const SIG_TYPE_SHORT: Record<string, string> = {
  single_leg: "Single",
  sweep: "Sweep",
  block: "Block",
  repeat_sweep: "Repeat",
  combo_spread: "Spread",
  combo_straddle: "Straddle",
  combo_risk_reversal: "Risk Rev.",
  combo_other: "Combo",
};

type SortKey = "score" | "premium" | "dte";

interface TopListTableProps {
  items: TopListItem[];
  isLoading?: boolean;
}

export function TopListTable({ items, isLoading }: TopListTableProps) {
  const setSelectedSignalId = useAppStore((s) => s.setSelectedSignalId);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortAsc, setSortAsc] = useState(false);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setAscDesc(key);
    else { setSortKey(key); setSortAsc(false); }
  }

  function setAscDesc(_key: SortKey) {
    setSortAsc((v) => !v);
  }

  const sorted = [...items].sort((a, b) => {
    let va = 0, vb = 0;
    if (sortKey === "score") {
      va = a.signal.totalScore; vb = b.signal.totalScore;
    } else if (sortKey === "premium") {
      va = a.signal.totalPremium; vb = b.signal.totalPremium;
    } else {
      va = a.signal.legs[0]?.dte ?? 0; vb = b.signal.legs[0]?.dte ?? 0;
    }
    return sortAsc ? va - vb : vb - va;
  });

  const SortIcon = sortAsc ? ChevronUp : ChevronDown;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-surface-raised animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-surface-border overflow-hidden">
      {/* Sort controls */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-surface-border bg-surface-raised">
        <span className="text-[11px] text-zinc-500 mr-1">Sort:</span>
        {(["score", "premium", "dte"] as SortKey[]).map((k) => (
          <button
            key={k}
            onClick={() => toggleSort(k)}
            className={cn(
              "flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
              sortKey === k
                ? "bg-signal-cyan/15 text-signal-cyan border border-signal-cyan/25"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {k === "score" ? "Score" : k === "premium" ? "Premium" : "DTE"}
            {sortKey === k && <SortIcon className="w-3 h-3" />}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-zinc-600">{items.length} signals</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-zinc-600 border-b border-surface-border bg-surface-raised/50">
              <th className="px-3 py-2 text-left w-8">#</th>
              <th className="px-3 py-2 text-left">Symbol</th>
              <th className="px-3 py-2 text-left hidden md:table-cell">Type</th>
              <th className="px-3 py-2 text-right">Premium</th>
              <th className="px-3 py-2 text-center">Score</th>
              <th className="px-3 py-2 text-center hidden sm:table-cell">DTE</th>
              <th className="px-3 py-2 text-left hidden lg:table-cell">Event</th>
              <th className="px-3 py-2 text-right hidden lg:table-cell">Time</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, i) => {
              const sig = item.signal;
              const leg = sig.legs[0];
              const company = COMPANY_MAP[sig.symbol] ?? sig.symbol;
              const DirIcon =
                sig.direction === "bullish" ? TrendingUp
                : sig.direction === "bearish" ? TrendingDown
                : Minus;
              const dirColor =
                sig.direction === "bullish" ? "text-bull"
                : sig.direction === "bearish" ? "text-bear"
                : "text-amber-400";

              return (
                <tr
                  key={sig.id}
                  onClick={() => setSelectedSignalId(sig.id)}
                  className="border-b border-surface-border/50 hover:bg-surface-muted/40 cursor-pointer transition-colors"
                >
                  {/* Rank */}
                  <td className="px-3 py-2.5">
                    <span className="text-zinc-600 font-mono tabular-nums">
                      {item.rank ?? i + 1}
                    </span>
                  </td>

                  {/* Symbol + label */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <DirIcon className={cn("w-3 h-3 shrink-0", dirColor)} />
                      <span className="font-bold text-white">{sig.symbol}</span>
                      <span className="text-zinc-500 hidden sm:inline truncate max-w-[100px]">
                        {company.replace(/ (Inc\.|Corp\.|LLC|Ltd\.?|Trust)$/i, "")}
                      </span>
                      <ScoreLabelBadge label={item.label} size="xs" />
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    <span className="px-1.5 py-0.5 rounded bg-surface-muted text-zinc-400 font-mono text-[10px]">
                      {SIG_TYPE_SHORT[sig.signalType] ?? sig.signalType}
                    </span>
                  </td>

                  {/* Premium */}
                  <td className="px-3 py-2.5 text-right">
                    <span className={cn("font-bold font-mono", dirColor)}>
                      {formatDollar(sig.totalPremium)}
                    </span>
                  </td>

                  {/* Score bar */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className={cn(
                        "font-bold font-mono tabular-nums text-xs",
                        sig.totalScore >= 80 ? "text-signal-gold"
                        : sig.totalScore >= 65 ? "text-bull"
                        : "text-zinc-400",
                      )}>
                        {sig.totalScore}
                      </span>
                      <div className="w-10 h-1.5 rounded-full bg-surface-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            sig.totalScore >= 80 ? "bg-signal-gold"
                            : sig.totalScore >= 65 ? "bg-bull"
                            : "bg-zinc-500",
                          )}
                          style={{ width: `${sig.totalScore}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* DTE */}
                  <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                    <span className="font-mono text-zinc-400">
                      {leg?.dte ?? "—"}d
                    </span>
                  </td>

                  {/* Event badge */}
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    {sig.context.nearestEventType ? (
                      <span className="inline-flex items-center gap-1 text-signal-gold text-[10px]">
                        <AlertCircle className="w-3 h-3" />
                        {sig.context.daysToNearestEvent}d {sig.context.nearestEventType}
                      </span>
                    ) : (
                      <span className="text-zinc-700 text-[10px]">—</span>
                    )}
                  </td>

                  {/* Time ago */}
                  <td className="px-3 py-2.5 text-right hidden lg:table-cell">
                    <span className="text-zinc-600 text-[11px]">
                      {formatRelativeTime(sig.detectedAt)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
