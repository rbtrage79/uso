"use client";

import { useState } from "react";
import { Star, Plus, X } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { WatchlistTickerCard } from "@/components/watchlist/watchlist-ticker-card";
import { cn } from "@/lib/utils/formatting";
import { MOCK_UNDERLYINGS } from "@/data/mock-underlyings";

export default function WatchlistPage() {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useAppStore();
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");

  function handleAdd() {
    const sym = inputValue.trim().toUpperCase();
    if (!sym) return;
    if (watchlist.includes(sym)) {
      setError(`${sym} is already in your watchlist.`);
      return;
    }
    addToWatchlist(sym);
    setInputValue("");
    setError("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") {
      setInputValue("");
      setError("");
    }
  }

  // Suggested symbols not already in watchlist
  const suggestions = MOCK_UNDERLYINGS
    .map((u) => u.symbol)
    .filter((s) => !watchlist.includes(s))
    .slice(0, 5);

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-signal-cyan" />
            <h1 className="text-2xl font-bold text-white">My Watchlist</h1>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            Track symbols and see their latest unusual flow signals
          </p>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <p>{watchlist.length} {watchlist.length === 1 ? "symbol" : "symbols"} tracked</p>
        </div>
      </div>

      {/* Add ticker input */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 max-w-sm">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value.toUpperCase());
                setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter ticker (e.g. AAPL)"
              maxLength={10}
              className={cn(
                "w-full rounded-lg border bg-surface-raised px-3 py-2 text-sm font-mono text-white placeholder-zinc-600 outline-none",
                "focus:border-signal-cyan/50 transition-colors",
                error ? "border-bear/60" : "border-surface-border",
              )}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-signal-cyan/20 border border-signal-cyan/30 text-signal-cyan text-sm font-medium hover:bg-signal-cyan/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        {error && (
          <p className="text-xs text-bear">{error}</p>
        )}
        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Suggest:</span>
            {suggestions.map((sym) => (
              <button
                key={sym}
                onClick={() => {
                  addToWatchlist(sym);
                  setError("");
                }}
                className="px-2 py-0.5 rounded border border-surface-border text-[11px] font-mono text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
              >
                + {sym}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Watchlist grid */}
      {watchlist.length === 0 ? (
        <div className="text-center py-20">
          <Star className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">Your watchlist is empty</p>
          <p className="text-sm text-zinc-600 mt-1">Add tickers above to track unusual flow signals</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {watchlist.map((sym) => (
            <WatchlistTickerCard
              key={sym}
              symbol={sym}
              onRemove={removeFromWatchlist}
            />
          ))}
        </div>
      )}
    </div>
  );
}
