"use client";

import { formatDollar } from "@/lib/utils/formatting";
import { MOCK_STATS } from "@/data/mock-signals";
import { TrendingUp, TrendingDown, Minus, DollarSign, Star, Activity } from "lucide-react";

export function StatsBar() {
  const s = MOCK_STATS;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <StatCell label="Signals Today" value={s.signalsToday.toString()} icon={<Activity className="w-4 h-4 text-signal-cyan" />} />
      <StatCell label="Total Premium" value={formatDollar(s.totalPremiumToday)} icon={<DollarSign className="w-4 h-4 text-signal-gold" />} />
      <StatCell label="Bullish" value={s.bullishCount.toString()} icon={<TrendingUp className="w-4 h-4 text-bull" />} color="text-bull" />
      <StatCell label="Bearish" value={s.bearishCount.toString()} icon={<TrendingDown className="w-4 h-4 text-bear" />} color="text-bear" />
      <StatCell label="Avg Score" value={`${s.avgScore}/100`} icon={<Star className="w-4 h-4 text-signal-gold" />} />
      <StatCell label="Top Name" value={s.topSymbol} icon={<TrendingUp className="w-4 h-4 text-signal-purple" />} color="text-signal-purple" />
    </div>
  );
}

function StatCell({
  label,
  value,
  icon,
  color = "text-white",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-surface-raised border border-surface-border rounded-lg p-3">
      {icon}
      <div className="min-w-0">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider truncate">{label}</p>
        <p className={`text-sm font-bold font-mono ${color} truncate`}>{value}</p>
      </div>
    </div>
  );
}
