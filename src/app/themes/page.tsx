"use client";

import { MOCK_THEMES, MOCK_UNDERLYINGS } from "@/data/mock-underlyings";
import { MOCK_SIGNALS } from "@/data/mock-signals";
import { formatDollar, directionColor, cn } from "@/lib/utils/formatting";
import { SignalCard } from "@/components/dashboard/signal-card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState } from "react";

export default function ThemesPage() {
  const [activeTheme, setActiveTheme] = useState<string | null>(null);

  const themeSignals = activeTheme
    ? MOCK_SIGNALS.filter((s) => s.context.theme === MOCK_THEMES.find((t) => t.id === activeTheme)?.name)
    : MOCK_SIGNALS.slice(0, 4);

  return (
    <div className="max-w-screen-xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-bold text-white">Theme &amp; Sector Flow</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Synchronized unusual flow across names and sub-sectors</p>
      </div>

      {/* Theme grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MOCK_THEMES.map((theme) => {
          const active = activeTheme === theme.id;
          const DirIcon = theme.dominantDirection === "bullish" ? TrendingUp
            : theme.dominantDirection === "bearish" ? TrendingDown
            : Minus;

          return (
            <button
              key={theme.id}
              onClick={() => setActiveTheme(active ? null : theme.id)}
              className={cn(
                "text-left p-4 rounded-xl border transition-all",
                active
                  ? "border-signal-cyan/40 bg-signal-cyan/5"
                  : "border-surface-border bg-surface-raised hover:border-zinc-600",
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{theme.emoji}</span>
                  <span className="font-semibold text-white text-sm">{theme.name}</span>
                </div>
                <DirIcon className={cn("w-4 h-4", directionColor(theme.dominantDirection ?? "neutral"))} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-zinc-500">Premium</p>
                  <p className="font-bold font-mono text-white">{formatDollar(theme.totalPremiumToday)}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Signals</p>
                  <p className="font-bold font-mono text-white">{theme.signalCount}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Members</p>
                  <p className="font-bold font-mono text-white">{theme.memberCount}</p>
                </div>
              </div>
              {/* Color bar */}
              <div className="mt-3 h-1 rounded-full overflow-hidden bg-surface-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(theme.totalPremiumToday / 20_000_000) * 100}%`,
                    background: theme.color ?? "#06b6d4",
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Signals for selected theme */}
      <div>
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          {activeTheme
            ? `${MOCK_THEMES.find((t) => t.id === activeTheme)?.name} Signals`
            : "Recent Signals"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {themeSignals.map((s) => <SignalCard key={s.id} signal={s} />)}
        </div>
      </div>
    </div>
  );
}
