"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Zap, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { MOCK_FEED_POSTS } from "@/data/mock-feed-posts";
import { FeedCard } from "@/components/feed/feed-card";
import { SignalDrawer } from "@/components/feed/signal-drawer";
import { FeedFilters, DEFAULT_FILTERS, type FeedFilterState } from "@/components/feed/feed-filters";
import type { FeedPost } from "@/types/feed";

const PAGE_SIZE = 6;

function sortPosts(posts: FeedPost[], sort: FeedFilterState["sort"]): FeedPost[] {
  return [...posts].sort((a, b) => {
    if (sort === "score")   return b.totalScore - a.totalScore;
    if (sort === "novelty") return b.noveltyScore - a.noveltyScore;
    if (sort === "premium") return b.premium - a.premium;
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
  });
}

function filterPosts(posts: FeedPost[], f: FeedFilterState): FeedPost[] {
  return posts.filter((p) => {
    if (f.direction !== "all" && p.direction !== f.direction) return false;
    if (p.dte > f.maxDTE) return false;
    if (p.totalScore < f.minScore) return false;
    if (f.theme && p.primaryTheme !== f.theme) return false;
    if (f.search && !p.symbol.includes(f.search.toUpperCase())) return false;
    if (f.signalKind && p.signalKind !== f.signalKind) return false;
    return true;
  });
}

function formatPremium(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function FeedPage() {
  const [filters, setFilters]           = useState<FeedFilterState>(DEFAULT_FILTERS);
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
  const [page, setPage]                 = useState(1);
  const [activeTag, setActiveTag]       = useState<string | undefined>();
  const [lastRefresh, setLastRefresh]   = useState(new Date());
  const sentinelRef                     = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const f = filterPosts(MOCK_FEED_POSTS, filters);
    const tagged = activeTag ? f.filter((p) => p.tags.includes(activeTag)) : f;
    return sortPosts(tagged, filters.sort);
  }, [filters, activeTag]);

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  // reset page when filters change
  useEffect(() => { setPage(1); }, [filters, activeTag]);

  const loadMore = useCallback(() => {
    if (hasMore) setPage((p) => p + 1);
  }, [hasMore]);

  // infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  // close drawer on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedPost(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // stats
  const allPosts    = MOCK_FEED_POSTS;
  const bullCount   = allPosts.filter((p) => p.direction === "bullish").length;
  const bearCount   = allPosts.filter((p) => p.direction === "bearish").length;
  const avgScore    = Math.round(allPosts.reduce((s, p) => s + p.totalScore, 0) / allPosts.length);
  const totalPremium = allPosts.reduce((s, p) => s + p.premium, 0);

  const handleTagClick = (tag: string) => {
    setActiveTag((prev) => (prev === tag ? undefined : tag));
  };

  const handleRefresh = () => {
    setLastRefresh(new Date());
    setPage(1);
    setActiveTag(undefined);
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Flow Feed
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-normal text-zinc-500 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5">
              LIVE
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Unusual options flow — scored, enriched, explained
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Total Signals" value={String(allPosts.length)} />
        <StatCard
          label="Bullish"
          value={String(bullCount)}
          icon={<TrendingUp size={11} className="text-emerald-400" />}
          color="text-emerald-400"
        />
        <StatCard
          label="Bearish"
          value={String(bearCount)}
          icon={<TrendingDown size={11} className="text-rose-400" />}
          color="text-rose-400"
        />
        <StatCard label="Avg Score" value={String(avgScore)} color="text-amber-400" />
      </div>

      {/* Active tag chip */}
      {activeTag && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Filtering by tag:</span>
          <button
            onClick={() => setActiveTag(undefined)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors"
          >
            {activeTag}
            <span className="text-zinc-500 ml-0.5">×</span>
          </button>
        </div>
      )}

      {/* Filters */}
      <FeedFilters
        filters={filters}
        onChange={setFilters}
        resultCount={filtered.length}
      />

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-600 space-y-2">
          <Minus size={24} />
          <p className="text-sm">No signals match your filters</p>
          <button
            onClick={() => { setFilters(DEFAULT_FILTERS); setActiveTag(undefined); }}
            className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((post) => (
            <FeedCard
              key={post.id}
              post={post}
              onOpen={setSelectedPost}
              onTagClick={handleTagClick}
              activeTag={activeTag}
            />
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />

          {hasMore && (
            <div className="flex justify-center py-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {!hasMore && filtered.length > PAGE_SIZE && (
            <p className="text-center text-xs text-zinc-700 py-4">
              All {filtered.length} signals loaded
            </p>
          )}
        </div>
      )}

      {/* Signal Detail Drawer */}
      <SignalDrawer
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onTagClick={handleTagClick}
      />
    </div>
  );
}

function StatCard({
  label, value, icon, color = "text-white",
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="bg-[#0d0d14] border border-[#1e1e2e] rounded-lg px-3 py-2 space-y-0.5">
      <p className="text-[10px] text-zinc-600 uppercase tracking-wide">{label}</p>
      <p className={`text-base font-bold ${color} flex items-center gap-1`}>
        {icon}{value}
      </p>
    </div>
  );
}
