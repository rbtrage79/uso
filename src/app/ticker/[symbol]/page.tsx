"use client";

import { use, useState } from "react";
import { useSignals } from "@/hooks/use-signals";
import { SignalCard } from "@/components/dashboard/signal-card";
import { MOCK_UNDERLYINGS } from "@/data/mock-underlyings";
import { generateMockChain } from "@/lib/polygon/mock";
import { formatDollar, formatPct, formatIV, cn } from "@/lib/utils/formatting";
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import { StrikeHeatmap } from "@/components/ticker/strike-heatmap";
import { MOCK_HEATMAP_AAPL } from "@/data/mock-heatmap";

export default function TickerPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const sym = symbol.toUpperCase();
  const underlying = MOCK_UNDERLYINGS.find((u) => u.symbol === sym);
  const { signals } = useSignals({ symbols: [sym] });

  const [selectedExpiry, setSelectedExpiry] = useState("all");
  const [heatmapOpen, setHeatmapOpen] = useState(true);

  const spot = underlying?.currentPrice ?? 100;
  const chain = generateMockChain(sym, spot, 30);
  const strikes = [...new Set(chain.map((c) => c.details.strike_price))].sort((a, b) => a - b);
  const atmStrike = strikes.reduce((best, s) => Math.abs(s - spot) < Math.abs(best - spot) ? s : best, strikes[0]);

  const priceUp = (underlying?.dayChangePercent ?? 0) >= 0;

  return (
    <div className="max-w-screen-xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white font-mono">{sym}</h1>
            {underlying && (
              <span className="text-sm text-zinc-400">{underlying.name}</span>
            )}
          </div>
          {underlying && (
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xl font-bold font-mono text-white">
                ${underlying.currentPrice?.toFixed(2)}
              </span>
              <span className={cn("flex items-center gap-0.5 text-sm font-medium", priceUp ? "text-bull" : "text-bear")}>
                {priceUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {formatPct(underlying.dayChangePercent ?? 0)}
              </span>
              {underlying.sector && (
                <span className="text-xs text-zinc-500 bg-surface-muted px-2 py-0.5 rounded">
                  {underlying.sector}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="text-right text-xs text-zinc-500 space-y-1">
          <p>Mkt Cap: <span className="text-zinc-300">{underlying?.marketCap ? formatDollar(underlying.marketCap) : "—"}</span></p>
          <p>Avg Vol 30d: <span className="text-zinc-300">{underlying?.avgVolume30d ? formatDollar(underlying.avgVolume30d) : "—"}</span></p>
          <p>Beta: <span className="text-zinc-300">{underlying?.beta?.toFixed(2) ?? "—"}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Options chain */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-surface-raised border border-surface-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Options Chain (30 DTE)</h2>
              <span className="text-xs text-zinc-500">Spot: <span className="text-white font-mono">${spot.toFixed(2)}</span></span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-zinc-500 border-b border-surface-border">
                    <td className="px-3 py-2 text-bull text-center" colSpan={4}>CALLS</td>
                    <td className="px-3 py-2 text-center text-zinc-300 font-bold">STRIKE</td>
                    <td className="px-3 py-2 text-bear text-center" colSpan={4}>PUTS</td>
                  </tr>
                  <tr className="text-zinc-500 border-b border-surface-border">
                    <td className="px-3 py-1.5">IV</td>
                    <td className="px-3 py-1.5">Δ</td>
                    <td className="px-3 py-1.5">OI</td>
                    <td className="px-3 py-1.5">Vol</td>
                    <td className="px-3 py-1.5 text-center font-bold text-zinc-300">Strike</td>
                    <td className="px-3 py-1.5">IV</td>
                    <td className="px-3 py-1.5">Δ</td>
                    <td className="px-3 py-1.5">OI</td>
                    <td className="px-3 py-1.5">Vol</td>
                  </tr>
                </thead>
                <tbody>
                  {strikes.map((strike) => {
                    const callData = chain.find((c) => c.details.strike_price === strike && c.details.contract_type === "call");
                    const putData  = chain.find((c) => c.details.strike_price === strike && c.details.contract_type === "put");
                    const isAtm = strike === atmStrike;

                    return (
                      <tr
                        key={strike}
                        className={cn(
                          "border-b border-surface-border/50 hover:bg-surface-muted/30",
                          isAtm && "bg-signal-cyan/5 border-signal-cyan/20",
                        )}
                      >
                        <td className="px-3 py-1.5 text-zinc-300">{callData?.implied_volatility ? formatIV(callData.implied_volatility) : "—"}</td>
                        <td className="px-3 py-1.5 text-bull">{callData?.greeks?.delta?.toFixed(2) ?? "—"}</td>
                        <td className="px-3 py-1.5">{(callData?.open_interest ?? 0).toLocaleString()}</td>
                        <td className="px-3 py-1.5">{(callData?.day?.volume ?? 0).toLocaleString()}</td>
                        <td className={cn("px-3 py-1.5 text-center font-bold", isAtm ? "text-signal-cyan" : "text-zinc-300")}>
                          {isAtm && <span title="At the money" className="mr-1">→</span>}
                          ${strike}
                        </td>
                        <td className="px-3 py-1.5 text-zinc-300">{putData?.implied_volatility ? formatIV(putData.implied_volatility) : "—"}</td>
                        <td className="px-3 py-1.5 text-bear">{putData?.greeks?.delta?.toFixed(2) ?? "—"}</td>
                        <td className="px-3 py-1.5">{(putData?.open_interest ?? 0).toLocaleString()}</td>
                        <td className="px-3 py-1.5">{(putData?.day?.volume ?? 0).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Signals sidebar */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Recent Signals ({signals.length})
          </h2>
          {signals.length > 0 ? (
            signals.map((s) => <SignalCard key={s.id} signal={s} compact />)
          ) : (
            <p className="text-xs text-zinc-600 text-center py-8">No signals detected for {sym}.</p>
          )}
        </div>
      </div>

      {/* Options Flow Heatmap */}
      <div className="bg-surface-raised border border-surface-border rounded-lg overflow-hidden">
        <button
          onClick={() => setHeatmapOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 border-b border-surface-border hover:bg-surface-muted/30 transition-colors"
        >
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Options Flow Heatmap
          </h2>
          {heatmapOpen
            ? <ChevronUp className="w-4 h-4 text-zinc-500" />
            : <ChevronDown className="w-4 h-4 text-zinc-500" />
          }
        </button>
        {heatmapOpen && (
          <div className="p-4">
            <StrikeHeatmap
              cells={MOCK_HEATMAP_AAPL}
              underlyingPrice={spot}
              symbol={sym}
            />
          </div>
        )}
      </div>
    </div>
  );
}
