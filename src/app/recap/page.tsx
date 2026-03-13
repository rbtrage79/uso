"use client";

import { BookOpen, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { MOCK_RECAP } from "@/data/mock-recap";
import { MOCK_SIGNALS } from "@/data/mock-signals";
import { TweetThread } from "@/components/recap/tweet-thread";
import { FiveThings } from "@/components/recap/five-things";
import { SignalCard } from "@/components/dashboard/signal-card";
import { cn } from "@/lib/utils/formatting";

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, trend }: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "flat";
}) {
  const trendColor =
    trend === "up"   ? "text-bull"
    : trend === "down" ? "text-bear"
    : "text-zinc-400";

  const TrendIcon =
    trend === "up"   ? TrendingUp
    : trend === "down" ? TrendingDown
    : Minus;

  return (
    <div className="bg-surface-raised border border-surface-border rounded-lg px-4 py-3 space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">{label}</p>
      <div className="flex items-end gap-1.5">
        <p className="text-xl font-bold font-mono text-white">{value}</p>
        {trend && trend !== "flat" && (
          <TrendIcon className={cn("w-4 h-4 mb-0.5 shrink-0", trendColor)} />
        )}
      </div>
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RecapPage() {
  const recap = MOCK_RECAP;

  // Look up top signal from MOCK_SIGNALS by topSignalId
  const topSignal = MOCK_SIGNALS.find((s) => s.id === recap.topSignalId) ?? null;

  const dateLabel = new Date(recap.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-screen-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-signal-cyan" />
            <h1 className="text-2xl font-bold text-white">Daily Recap</h1>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">{dateLabel}</p>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <p className="text-zinc-600">AI-generated · Mock data</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {recap.stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            sub={stat.sub}
            trend={stat.trend}
          />
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* Left column: top signal + five things */}
        <div className="xl:col-span-3 space-y-6">
          {/* Top Signal of the Day */}
          {topSignal && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                  🏆 Top Signal of the Day
                </span>
              </div>
              <SignalCard signal={topSignal} />
            </div>
          )}

          {/* Five Things to Watch */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                👀 5 Things to Watch Tomorrow
              </span>
            </div>
            <FiveThings items={recap.fiveThings} />
          </div>
        </div>

        {/* Right column: tweet thread */}
        <div className="xl:col-span-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                🧵 Recap Thread
              </span>
            </div>
            <div className="bg-surface-raised border border-surface-border rounded-xl p-4">
              <TweetThread posts={recap.tweetThread} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
