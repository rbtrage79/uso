"use client";

import { formatRelativeTime, formatDollar, directionColor, directionBg, scoreColor, cn } from "@/lib/utils/formatting";
import type { EnrichedSignal } from "@/types/signals";
import { TrendingUp, TrendingDown, Minus, Layers, AlertCircle, Zap } from "lucide-react";

const SIGNAL_TYPE_LABEL: Record<string, string> = {
  single_leg: "Single",
  sweep: "Sweep",
  block: "Block",
  repeat_sweep: "Rep. Sweep",
  combo_spread: "Spread",
  combo_straddle: "Straddle",
  combo_risk_reversal: "Risk Rev.",
  combo_other: "Combo",
};

interface SignalCardProps {
  signal: EnrichedSignal;
  compact?: boolean;
  onClick?: () => void;
}

export function SignalCard({ signal, compact, onClick }: SignalCardProps) {
  const leg = signal.legs[0];
  const premium = formatDollar(signal.totalPremium);
  const expDate = leg ? leg.expiration.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
  const iv = leg?.impliedVol != null ? `${(leg.impliedVol * 100).toFixed(0)}% IV` : null;

  const DirectionIcon =
    signal.direction === "bullish" ? TrendingUp
    : signal.direction === "bearish" ? TrendingDown
    : Minus;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border p-3 transition-all hover:border-zinc-600 bg-surface-raised",
        directionBg(signal.direction),
        compact ? "space-y-1" : "space-y-2",
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white tracking-wide">{signal.symbol}</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-muted text-zinc-400 font-mono">
            {SIGNAL_TYPE_LABEL[signal.signalType] ?? signal.signalType}
          </span>
          {signal.isCombo && (
            <span title="Multi-leg">
              <Layers className="w-3.5 h-3.5 text-signal-purple" />
            </span>
          )}
          {signal.context.nearestEventType && (
            <span title={`${signal.context.daysToNearestEvent}d to ${signal.context.nearestEventType}`}>
              <AlertCircle className="w-3.5 h-3.5 text-signal-gold" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("text-xs font-bold font-mono", scoreColor(signal.totalScore))}>
            {signal.totalScore}
          </span>
          <div className="w-12 h-1.5 rounded-full bg-surface-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full", signal.totalScore >= 80 ? "bg-signal-gold" : signal.totalScore >= 65 ? "bg-bull" : "bg-signal-cyan")}
              style={{ width: `${signal.totalScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Premium + direction */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <DirectionIcon className={cn("w-3.5 h-3.5", directionColor(signal.direction))} />
          <span className={cn("text-base font-bold font-mono", directionColor(signal.direction))}>
            {premium}
          </span>
          <span className="text-xs text-zinc-500">
            {signal.totalContracts.toLocaleString()} cts
          </span>
        </div>
        {leg && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
            <span className="font-medium text-zinc-300">
              ${leg.strike}{leg.optionType === "call" ? "C" : "P"}
            </span>
            <span>{expDate}</span>
            <span className="text-zinc-500">{leg.dte}d</span>
          </div>
        )}
      </div>

      {/* IV + context */}
      {!compact && (
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2 text-zinc-500">
            {iv && <span>{iv}</span>}
            {signal.context.nearestEventType && (
              <span className="text-signal-gold">
                {signal.context.daysToNearestEvent}d to {signal.context.nearestEventType}
              </span>
            )}
            {signal.context.theme && (
              <span className="text-signal-purple">{signal.context.theme}</span>
            )}
          </div>
          <span className="text-zinc-600">{formatRelativeTime(signal.detectedAt)}</span>
        </div>
      )}

      {/* Score bar breakdown */}
      {!compact && (
        <div className="flex gap-0.5 pt-0.5">
          {Object.entries(signal.scoreBreakdown)
            .filter(([, v]) => v !== undefined && v > 0)
            .slice(0, 8)
            .map(([key, val]) => (
              <div
                key={key}
                title={`${key}: ${val}`}
                className="h-1 flex-1 rounded-full bg-surface-muted overflow-hidden"
              >
                <div
                  className={cn(
                    "h-full",
                    (val ?? 0) >= 75 ? "bg-signal-gold"
                    : (val ?? 0) >= 55 ? "bg-bull/70"
                    : "bg-zinc-600",
                  )}
                  style={{ width: `${val}%` }}
                />
              </div>
            ))}
        </div>
      )}
    </button>
  );
}
