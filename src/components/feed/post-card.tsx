"use client";

import { formatRelativeTime, formatDollar, directionColor, directionBg, scoreColor, cn } from "@/lib/utils/formatting";
import type { EnrichedSignal } from "@/types/signals";

interface PostCardProps {
  signal: EnrichedSignal;
}

export function PostCard({ signal }: PostCardProps) {
  const post = signal.feedPost;
  if (!post) return null;

  return (
    <article className={cn("rounded-xl border p-4 space-y-3 transition-colors hover:border-zinc-600", directionBg(signal.direction))}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{post.emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">${signal.symbol}</span>
              <span className={cn("text-xs font-bold uppercase", directionColor(signal.direction))}>
                {signal.direction}
              </span>
              <span className={cn("text-xs font-mono font-bold", scoreColor(signal.totalScore))}>
                Score {signal.totalScore}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{formatRelativeTime(signal.detectedAt)}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("text-lg font-bold font-mono", directionColor(signal.direction))}>
            {formatDollar(signal.totalPremium)}
          </p>
          <p className="text-xs text-zinc-500">{signal.totalContracts.toLocaleString()} cts</p>
        </div>
      </div>

      {/* Headline */}
      <p className="text-sm font-semibold text-zinc-100 leading-snug">{post.headline}</p>

      {/* Body */}
      <div className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">{post.body}</div>

      {/* Leg pills */}
      <div className="flex flex-wrap gap-1.5">
        {signal.legs.map((leg, i) => (
          <span
            key={i}
            className="text-[11px] px-2 py-0.5 rounded-full bg-surface-muted border border-surface-border font-mono text-zinc-300"
          >
            ${leg.strike}{leg.optionType === "call" ? "C" : "P"} {leg.dte}d
            {leg.impliedVol ? ` · ${(leg.impliedVol * 100).toFixed(0)}%IV` : ""}
          </span>
        ))}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {post.tags.map((tag) => (
          <span key={tag} className="text-[11px] text-signal-cyan/70 font-mono">
            {tag}
          </span>
        ))}
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-surface-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full",
              signal.totalScore >= 80 ? "bg-signal-gold"
              : signal.totalScore >= 65 ? "bg-bull"
              : "bg-signal-cyan",
            )}
            style={{ width: `${signal.totalScore}%` }}
          />
        </div>
        <span className="text-[10px] text-zinc-600 shrink-0">
          {(signal.confidence * 100).toFixed(0)}% conf.
        </span>
      </div>
    </article>
  );
}
