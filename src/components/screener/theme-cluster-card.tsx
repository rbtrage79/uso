"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatDollar, cn } from "@/lib/utils/formatting";
import { ScoreLabelBadge } from "@/components/shared/score-label-badge";
import type { ThemeCluster } from "@/types/features";

interface ThemeClusterCardProps {
  cluster: ThemeCluster;
  onClick?: (cluster: ThemeCluster) => void;
}

export function ThemeClusterCard({ cluster, onClick }: ThemeClusterCardProps) {
  const bullish = cluster.signals.filter((s) => s.direction === "bullish").length;
  const bearish = cluster.signals.filter((s) => s.direction === "bearish").length;
  const neutral = cluster.signals.filter((s) => s.direction === "neutral").length;
  const total = cluster.signalCount || 1;

  const DirIcon =
    cluster.dominantDirection === "bullish" ? TrendingUp
    : cluster.dominantDirection === "bearish" ? TrendingDown
    : Minus;
  const dirColor =
    cluster.dominantDirection === "bullish" ? "text-bull"
    : cluster.dominantDirection === "bearish" ? "text-bear"
    : "text-amber-400";

  return (
    <div
      onClick={() => onClick?.(cluster)}
      className={cn(
        "rounded-xl border border-surface-border bg-surface-raised p-4 space-y-3",
        onClick && "cursor-pointer hover:border-zinc-600 transition-colors",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{cluster.emoji}</span>
          <div>
            <h3 className="text-sm font-bold text-white">{cluster.themeName}</h3>
            <p className="text-[11px] text-zinc-500">
              {cluster.signalCount} signal{cluster.signalCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold font-mono text-white">
            {formatDollar(cluster.totalPremium)}
          </p>
          <p className="text-[11px] text-zinc-500">total premium</p>
        </div>
      </div>

      {/* Avg score bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-zinc-500">Avg Score</span>
          <span className={cn(
            "text-xs font-bold font-mono",
            cluster.avgScore >= 80 ? "text-signal-gold"
            : cluster.avgScore >= 65 ? "text-bull"
            : "text-zinc-400",
          )}>
            {cluster.avgScore}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full",
              cluster.avgScore >= 80 ? "bg-signal-gold"
              : cluster.avgScore >= 65 ? "bg-bull"
              : "bg-zinc-500",
            )}
            style={{ width: `${cluster.avgScore}%` }}
          />
        </div>
      </div>

      {/* Direction split bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-zinc-500">Direction</span>
          <div className="flex items-center gap-1">
            <DirIcon className={cn("w-3 h-3", dirColor)} />
            <span className={cn("text-[11px] font-medium capitalize", dirColor)}>
              {cluster.dominantDirection}
            </span>
          </div>
        </div>
        <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
          {bullish > 0 && (
            <div
              className="bg-bull rounded-full"
              style={{ flex: bullish / total }}
              title={`Bullish: ${bullish}`}
            />
          )}
          {neutral > 0 && (
            <div
              className="bg-amber-500 rounded-full"
              style={{ flex: neutral / total }}
              title={`Neutral: ${neutral}`}
            />
          )}
          {bearish > 0 && (
            <div
              className="bg-bear rounded-full"
              style={{ flex: bearish / total }}
              title={`Bearish: ${bearish}`}
            />
          )}
        </div>
      </div>

      {/* Top symbols */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {cluster.topSymbols.slice(0, 4).map((sym) => (
          <span
            key={sym}
            className="px-1.5 py-0.5 rounded bg-surface-muted border border-surface-border text-[11px] font-mono text-zinc-300"
          >
            {sym}
          </span>
        ))}
      </div>

      {/* Label pills */}
      {cluster.labels.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap pt-0.5">
          {[...new Set(cluster.labels)].slice(0, 2).map((lbl) => (
            <ScoreLabelBadge key={lbl} label={lbl} size="xs" />
          ))}
        </div>
      )}
    </div>
  );
}
