"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Zap, ExternalLink } from "lucide-react";
import { MOCK_FEED_POSTS } from "@/data/mock-feed-posts";
import { MOCK_UNDERLYINGS } from "@/data/mock-underlyings";
import { FeedCard } from "@/components/feed/feed-card";
import { SignalDrawer } from "@/components/feed/signal-drawer";
import type { FeedPost } from "@/types/feed";
import { cn } from "@/lib/utils";

type SortKey = "latest" | "score" | "premium";

function fmtPrice(n: number) {
  return n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(4)}`;
}

function fmtPct(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function fmtPremium(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function TickerFeedPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const sym = symbol.toUpperCase();

  const underlying = MOCK_UNDERLYINGS.find((u) => u.symbol === sym);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [sort, setSort] = useState<SortKey>("latest");
  const [dirFilter, setDirFilter] = useState<"all" | "bullish" | "bearish" | "neutral">("all");
  const [activeTag, setActiveTag] = useState<string | undefined>();

  const posts = useMemo(() => {
    let p = MOCK_FEED_POSTS.filter((post) => post.symbol === sym);
    if (dirFilter !== "all") p = p.filter((post) => post.direction === dirFilter);
    if (activeTag) p = p.filter((post) => post.tags.includes(activeTag));
    return [...p].sort((a, b) => {
      if (sort === "score")   return b.totalScore - a.totalScore;
      if (sort === "premium") return b.premium - a.premium;
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    });
  }, [sym, sort, dirFilter, activeTag]);

  const bullCount   = posts.filter((p) => p.direction === "bullish").length;
  const bearCount   = posts.filter((p) => p.direction === "bearish").length;
  const totalPrem   = posts.reduce((s, p) => s + p.premium, 0);
  const avgScore    = posts.length ? Math.round(posts.reduce((s, p) => s + p.totalScore, 0) / posts.length) : 0;
  const priceUp     = (underlying?.dayChangePercent ?? 0) >= 0;

  const handleTagClick = (tag: string) =>
    setActiveTag((prev) => (prev === tag ? undefined : tag));

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12">
      {/* Back nav */}
      <Link
        href="/feed"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft size={13} /> Back to Feed
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white font-mono">{sym}</h1>
            {underlying && (
              <span className="text-sm text-zinc-400">{underlying.name}</span>
            )}
            <Link
              href={`/ticker/${sym}`}
              className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              title="View options chain"
            >
              <ExternalLink size={12} /> Chain
            </Link>
          </div>
          {underlying && (
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xl font-bold font-mono text-white">
                {fmtPrice(underlying.currentPrice ?? 0)}
              </span>
              <span
                className={cn(
                  "flex items-center gap-0.5 text-sm font-medium",
                  priceUp ? "text-emerald-400" : "text-rose-400",
                )}
              >
                {priceUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {fmtPct(underlying.dayChangePercent ?? 0)}
              </span>
              {underlying.sector && (
                <span className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                  {underlying.sector}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="text-right text-xs text-zinc-500 space-y-0.5">
          {underlying?.marketCap && (
            <p>Mkt Cap: <span className="text-zinc-300">{fmtPremium(underlying.marketCap)}</span></p>
          )}
          {underlying?.beta != null && (
            <p>Beta: <span className="text-zinc-300">{underlying.beta.toFixed(2)}</span></p>
          )}
        </div>
      </div>

      {/* Signal summary bar */}
      <div className="grid grid-cols-4 gap-2">
        <MiniStat label="Signals" value={String(posts.length)} />
        <MiniStat
          label="Bullish"
          value={String(bullCount)}
          color="text-emerald-400"
          icon={<TrendingUp size={10} />}
        />
        <MiniStat
          label="Bearish"
          value={String(bearCount)}
          color="text-rose-400"
          icon={<TrendingDown size={10} />}
        />
        <MiniStat label="Avg Score" value={String(avgScore)} color="text-amber-400" />
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Direction filter */}
        <div className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
          {(["all", "bullish", "bearish", "neutral"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirFilter(d)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border",
                dirFilter === d
                  ? d === "bullish" ? "bg-emerald-900/40 text-emerald-400 border-emerald-700/40"
                    : d === "bearish" ? "bg-rose-900/40 text-rose-400 border-rose-700/40"
                    : d === "neutral" ? "bg-amber-900/40 text-amber-400 border-amber-700/40"
                    : "bg-zinc-700 text-white border-zinc-600"
                  : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-300",
              )}
            >
              {d === "all" ? "All" : d === "bullish" ? "🟢 Bull" : d === "bearish" ? "🔴 Bear" : "🟡 Neutral"}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900 p-0.5 ml-auto">
          {(["latest", "score", "premium"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-all capitalize",
                sort === s ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Active tag chip */}
      {activeTag && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Tag:</span>
          <button
            onClick={() => setActiveTag(undefined)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
          >
            {activeTag}
            <span className="text-zinc-500 ml-0.5">×</span>
          </button>
        </div>
      )}

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-600 space-y-3">
          <Zap size={24} />
          <p className="text-sm">No flow signals for <span className="font-mono text-zinc-400">{sym}</span></p>
          {(dirFilter !== "all" || activeTag) && (
            <button
              onClick={() => { setDirFilter("all"); setActiveTag(undefined); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
          {dirFilter === "all" && !activeTag && (
            <Link href="/feed" className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2">
              Browse all signals
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <FeedCard
              key={post.id}
              post={post}
              onOpen={setSelectedPost}
              onTagClick={handleTagClick}
              activeTag={activeTag}
            />
          ))}
          <p className="text-center text-xs text-zinc-700 pt-2">
            {posts.length} signal{posts.length !== 1 ? "s" : ""} for {sym}
          </p>
        </div>
      )}

      <SignalDrawer
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onTagClick={handleTagClick}
      />
    </div>
  );
}

function MiniStat({
  label, value, color = "text-white", icon,
}: {
  label: string;
  value: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-lg px-3 py-2 space-y-0.5">
      <p className="text-[10px] text-zinc-600 uppercase tracking-wide">{label}</p>
      <p className={cn("text-base font-bold flex items-center gap-1", color)}>
        {icon}{value}
      </p>
    </div>
  );
}
