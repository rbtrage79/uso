"use client";

import { cn } from "@/lib/utils";
import type { FeedPost } from "@/types/feed";
import type { ScoreLabel } from "@/types/features";
import { Sparkline } from "./sparkline";
import { TagList } from "./tag-pill";
import { ExplanationTabs } from "./explanation-tabs";
import { ConfidenceTooltip } from "./confidence-tooltip";
import { ScoreLabelBadge } from "@/components/shared/score-label-badge";

/** Derive a ScoreLabel from FeedPost fields (mirrors getLabelForSignal logic) */
function getLabelForFeedPost(post: FeedPost): ScoreLabel {
  if (post.totalScore >= 80 && post.confidence >= 0.75) return "Smart Money? High Confidence";
  if (post.isCombo && post.direction === "neutral") return "Volatility Bid";
  if (post.hasKnownCatalyst && (post.daysToNearestEvent ?? 99) <= 14) return "Event Chase";
  if (post.direction === "bearish" && post.premium >= 500_000) return "Hedge Wave";
  if (post.primaryFactor && post.totalScore >= 60) return "Factor Rotation";
  if (post.noveltyScore >= 55 && !post.hasKnownCatalyst) return "Quiet Accumulation";
  if (post.volOiRatio >= 2.5 && post.totalScore >= 60) return "Breakout Speculation";
  if (post.totalScore >= 65 && post.confidence < 0.55) return "Smart Money? Low Confidence";
  return "Quiet Accumulation";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtPremium(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

function fmtContracts(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;
}

function scoreColor(score: number) {
  if (score >= 85) return "#f97316"; // orange
  if (score >= 70) return "#eab308"; // yellow
  if (score >= 55) return "#a3a3a3"; // neutral
  return "#71717a";
}

const DIR_CONFIG = {
  bullish: { label: "BULLISH ▲", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  bearish: { label: "BEARISH ▼", bg: "bg-rose-500/10",    text: "text-rose-400",    border: "border-rose-500/20",    dot: "bg-rose-400" },
  neutral: { label: "NEUTRAL",   bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20",   dot: "bg-amber-400" },
};

const UNUSUALNESS_CONFIG = {
  extreme:     { label: "EXTREME",     cls: "bg-red-500/15 text-red-400 border-red-500/20" },
  unusual:     { label: "UNUSUAL",     cls: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  noteworthy:  { label: "NOTEWORTHY",  cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  routine:     { label: "ROUTINE",     cls: "bg-zinc-700/40 text-zinc-400 border-zinc-700/40" },
};

const EVENT_IMPORTANCE_COLOR: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
  high:     "text-amber-400 bg-amber-500/10 border-amber-500/20",
  medium:   "text-blue-400 bg-blue-500/10 border-blue-500/20",
  low:      "text-zinc-400 bg-zinc-700/30 border-zinc-700/40",
};

// ── Component ────────────────────────────────────────────────────────────────

interface FeedCardProps {
  post: FeedPost;
  onOpen?: (post: FeedPost) => void;
  onClick?: (post: FeedPost) => void;
  onTagClick?: (tag: string) => void;
  activeTag?: string;
  compact?: boolean;
}

export function FeedCard({ post, onOpen, onClick, onTagClick, activeTag, compact }: FeedCardProps) {
  const dir     = DIR_CONFIG[post.direction];
  const unusual = UNUSUALNESS_CONFIG[post.unusualness];
  const sc      = scoreColor(post.totalScore);
  const handleClick = onOpen ?? onClick;
  const label   = getLabelForFeedPost(post);

  return (
    <article
      onClick={() => handleClick?.(post)}
      className={cn(
        "group relative rounded-xl border border-zinc-800/60 bg-[#111118] cursor-pointer",
        "hover:border-zinc-700/80 hover:bg-[#13131c] transition-all duration-150",
        "overflow-hidden",
      )}
    >
      {/* Left accent bar */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-[3px]",
          post.direction === "bullish" && "bg-emerald-500/60",
          post.direction === "bearish" && "bg-rose-500/60",
          post.direction === "neutral" && "bg-amber-500/60",
        )}
      />

      <div className="pl-4 pr-4 pt-3 pb-3 space-y-3">

        {/* ── Row 1: Ticker + Score + Timestamp ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {/* Direction badge */}
            <span className={cn("flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold tracking-widest", dir.bg, dir.text, dir.border)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", dir.dot)} />
              {dir.label}
            </span>

            {/* Ticker */}
            <span className="text-white font-bold text-base leading-none">{post.symbol}</span>

            {/* Signal label */}
            <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 text-[11px] font-medium border border-zinc-700/50">
              {post.signalLabel}
            </span>

            {/* Score label badge */}
            <ScoreLabelBadge label={label} size="sm" />

            {/* Unusualness */}
            <span className={cn("px-1.5 py-0.5 rounded border text-[10px] font-bold tracking-wide hidden sm:inline-flex", unusual.cls)}>
              {unusual.label}
            </span>

            {/* Merged indicator */}
            {post.mergedCount && post.mergedCount > 1 && (
              <span className="px-1.5 py-0.5 rounded bg-violet-900/40 text-violet-300 border border-violet-700/40 text-[10px] font-medium">
                ×{post.mergedCount} prints
              </span>
            )}
          </div>

          {/* Score + Time */}
          <div className="flex-shrink-0 flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tabular-nums" style={{ color: sc }}>{post.totalScore}</span>
              <div className="h-1.5 w-14 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${post.totalScore}%`, background: `linear-gradient(90deg, #ca8a04, ${sc})` }}
                />
              </div>
            </div>
            <span className="text-[11px] text-zinc-500">{post.timeAgo}</span>
          </div>
        </div>

        {/* ── Row 2: Company + Theme ── */}
        <div className="flex items-center gap-2 text-xs text-zinc-500 -mt-1">
          <span>{post.companyName}</span>
          {post.primaryTheme && (
            <>
              <span className="text-zinc-700">·</span>
              <span>{post.primaryThemeEmoji} {post.primaryTheme}</span>
            </>
          )}
          <span className="text-zinc-700">·</span>
          <span>{post.sector}</span>
        </div>

        {/* ── Row 3: Contract + Sparkline ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {/* Strike / expiry */}
            <div>
              <span className="text-zinc-500">Contract</span>
              <div className="font-semibold text-white text-sm mt-0.5">
                {post.optionType !== "mixed"
                  ? <>{post.optionType.toUpperCase()} <span className="text-amber-400">${post.strike}</span></>
                  : <span className="text-amber-400">COMBO</span>
                }
                <span className="text-zinc-400 font-normal ml-1">{post.expiration} · {post.dte}d</span>
              </div>
            </div>

            {/* Premium */}
            <div>
              <span className="text-zinc-500">Premium</span>
              <div className="font-bold text-white text-sm mt-0.5">
                {fmtPremium(post.premium)}
                <span className="text-zinc-500 font-normal ml-1 text-xs">/ {fmtContracts(post.contracts)} cts</span>
              </div>
            </div>

            {/* IV + Delta */}
            <div>
              <span className="text-zinc-500">IV · Delta</span>
              <div className="font-medium text-zinc-300 text-xs mt-0.5">
                <span className={post.impliedVol > 0.8 ? "text-orange-400" : "text-zinc-300"}>
                  {Math.round(post.impliedVol * 100)}%
                </span>
                {post.delta !== undefined && (
                  <span className="text-zinc-500 ml-1">· δ{Math.abs(post.delta).toFixed(2)}</span>
                )}
              </div>
            </div>

            {/* Vol/OI */}
            <div>
              <span className="text-zinc-500">Vol / OI</span>
              <div className="font-medium text-xs mt-0.5">
                <span className={cn(
                  post.volOiRatio >= 5 ? "text-red-400" :
                  post.volOiRatio >= 2 ? "text-amber-400" : "text-zinc-300",
                )}>
                  {post.volOiRatio.toFixed(1)}×
                </span>
                <span className="text-zinc-500 ml-1">OI {post.openInterest.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Sparkline */}
          <div className="flex-shrink-0">
            <Sparkline data={post.sparklineData} trend={post.sparklineTrend} width={80} height={32} />
          </div>
        </div>

        {/* ── Row 4: Event badges ── */}
        {post.events.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.events.filter(e => e.beforeExpiry).slice(0, 4).map((ev) => (
              <span
                key={ev.label}
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium",
                  EVENT_IMPORTANCE_COLOR[ev.importance],
                )}
              >
                {ev.emoji} {ev.label}
                <span className="opacity-70">{ev.daysAway}d</span>
              </span>
            ))}
          </div>
        )}

        {/* ── Row 5: Explanation tabs (hidden in compact mode) ── */}
        {!compact && (
          <div className="border-t border-zinc-800/60 pt-2.5">
            <ExplanationTabs explanations={post.explanations} />
          </div>
        )}

        {/* ── Row 6: Tags ── */}
        <div className="flex items-start justify-between gap-2">
          <TagList tags={post.tags} max={7} onTagClick={onTagClick} activeTag={activeTag} />
        </div>

        {/* ── Row 7: Footer ── */}
        <div className="flex items-center justify-between border-t border-zinc-800/40 pt-2">
          <ConfidenceTooltip post={post} />
          <span className="text-[10px] text-zinc-700">Not financial advice</span>
        </div>

      </div>
    </article>
  );
}
