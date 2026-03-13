"use client";

import { TrendingUp, TrendingDown, X, AlertCircle } from "lucide-react";
import { ScoreLabelBadge } from "@/components/shared/score-label-badge";
import { getLabelForSignal } from "@/lib/scoring/label";
import { formatDollar, formatRelativeTime, cn } from "@/lib/utils/formatting";
import { MOCK_UNDERLYINGS } from "@/data/mock-underlyings";
import { MOCK_SIGNALS } from "@/data/mock-signals";

interface WatchlistTickerCardProps {
  symbol: string;
  onRemove: (symbol: string) => void;
}

/** Simple SVG sparkline for a 20-bar price array */
function MiniSparkline({ data, up }: { data: number[]; up: boolean }) {
  const w = 80, h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const color = up ? "#22c55e" : "#f43f5e";
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}

// Generate deterministic pseudo-random OI sparkline data seeded by symbol
function mockOIData(symbol: string): number[] {
  let seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const base = 40 + rand() * 40;
  return Array.from({ length: 20 }, () => base + (rand() - 0.5) * 20);
}

export function WatchlistTickerCard({ symbol, onRemove }: WatchlistTickerCardProps) {
  const underlying = MOCK_UNDERLYINGS.find((u) => u.symbol === symbol);
  const signals = MOCK_SIGNALS.filter((s) => s.symbol === symbol).slice(0, 3);
  const oispark = mockOIData(symbol);
  const priceUp = (underlying?.dayChangePercent ?? 0) >= 0;
  const topSignal = signals[0];
  const topLabel = topSignal ? getLabelForSignal(topSignal) : null;

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised p-4 space-y-3 hover:border-zinc-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white font-mono">{symbol}</span>
            {underlying && (
              <span className="text-xs text-zinc-500 truncate max-w-[120px]">
                {underlying.name.replace(/ (Inc\.|Corp\.|Trust|LLC|Ltd\.?)$/i, "")}
              </span>
            )}
          </div>
          {underlying && (
            <span className="text-[11px] text-zinc-600">{underlying.sector}</span>
          )}
        </div>
        <button
          onClick={() => onRemove(symbol)}
          title={`Remove ${symbol}`}
          className="p-1 rounded text-zinc-600 hover:text-bear hover:bg-bear/10 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Price + sparkline */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-bold font-mono text-white">
            ${underlying?.currentPrice?.toFixed(2) ?? "—"}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            {priceUp
              ? <TrendingUp className="w-3 h-3 text-bull" />
              : <TrendingDown className="w-3 h-3 text-bear" />
            }
            <span className={cn("text-xs font-medium", priceUp ? "text-bull" : "text-bear")}>
              {priceUp ? "+" : ""}
              {underlying?.dayChangePercent?.toFixed(2) ?? "0.00"}%
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <MiniSparkline data={oispark} up={priceUp} />
          <span className="text-[10px] text-zinc-600">OI Trend (20d)</span>
        </div>
      </div>

      {/* Recent signals */}
      {signals.length > 0 ? (
        <div className="space-y-1.5 border-t border-surface-border/50 pt-2">
          <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">
            Recent Signals
          </p>
          {signals.map((sig) => (
            <div
              key={sig.id}
              className="flex items-center justify-between gap-2 text-xs py-1"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={cn(
                  "font-medium",
                  sig.direction === "bullish" ? "text-bull"
                  : sig.direction === "bearish" ? "text-bear"
                  : "text-amber-400",
                )}>
                  {sig.direction === "bullish" ? "▲" : sig.direction === "bearish" ? "▼" : "—"}
                </span>
                <span className="font-mono text-zinc-300">{formatDollar(sig.totalPremium)}</span>
                {sig.context.nearestEventType && (
                  <AlertCircle className="w-3 h-3 text-signal-gold shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={cn(
                  "font-bold font-mono text-[11px]",
                  sig.totalScore >= 80 ? "text-signal-gold" : "text-zinc-400",
                )}>
                  {sig.totalScore}
                </span>
                <span className="text-zinc-600 text-[10px]">
                  {formatRelativeTime(sig.detectedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600 border-t border-surface-border/50 pt-2">
          No recent signals detected.
        </p>
      )}

      {/* Bottom label */}
      {topLabel && (
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-[10px] text-zinc-600">Latest:</span>
          <ScoreLabelBadge label={topLabel} size="sm" />
        </div>
      )}
    </div>
  );
}
