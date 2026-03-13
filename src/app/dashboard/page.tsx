"use client";

import { useSignals } from "@/hooks/use-signals";
import { useAppStore } from "@/store/app-store";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { SignalCard } from "@/components/dashboard/signal-card";
import { IntradayFlowChart } from "@/components/charts/flow-chart";
import { RefreshCw, Zap } from "lucide-react";

export default function DashboardPage() {
  const { filters } = useAppStore();
  const { signals, isLoading, error, refresh } = useSignals(filters);

  return (
    <div className="space-y-4 max-w-screen-2xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-signal-cyan" />
            Unusual Flow Radar
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time options flow detection · &lt;90 DTE · Scored &amp; enriched signals
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-surface-raised border border-surface-border rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats bar */}
      <StatsBar />

      {/* Intraday flow chart */}
      <div className="bg-surface-raised border border-surface-border rounded-lg p-4">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Intraday Premium Flow
        </h2>
        <IntradayFlowChart />
      </div>

      {/* Filters */}
      <FilterBar />

      {/* Signal grid */}
      {error && (
        <div className="p-4 rounded-lg border border-bear/30 bg-bear/10 text-bear text-sm">{error}</div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-surface-raised border border-surface-border animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{signals.length} signals</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {signals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
            {signals.length === 0 && (
              <div className="col-span-full text-center py-16 text-zinc-600">
                No signals match your filters.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
