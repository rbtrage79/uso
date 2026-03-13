"use client";

import { cn } from "@/lib/utils/formatting";
import { ScoreLabelBadge } from "@/components/shared/score-label-badge";
import type { ThingToWatch } from "@/types/features";

interface FiveThingsProps {
  items: ThingToWatch[];
}

const CATALYST_BADGE: Record<string, { label: string; color: string }> = {
  earnings: { label: "Earnings", color: "text-signal-gold bg-signal-gold/10 border-signal-gold/25" },
  fda:      { label: "FDA",      color: "text-purple-400 bg-purple-400/10 border-purple-400/25" },
  technical:{ label: "Technical",color: "text-sky-400 bg-sky-400/10 border-sky-400/25" },
  theme:    { label: "Theme",    color: "text-teal-400 bg-teal-400/10 border-teal-400/25" },
  macro:    { label: "Macro",    color: "text-red-400 bg-red-400/10 border-red-400/25" },
};

export function FiveThings({ items }: FiveThingsProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const catalyst = item.catalyst ? CATALYST_BADGE[item.catalyst] : null;

        return (
          <div
            key={item.rank}
            className="flex gap-3 p-4 rounded-xl border border-surface-border bg-surface-raised hover:border-zinc-600 transition-colors"
          >
            {/* Rank number */}
            <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
              style={{
                background: `linear-gradient(135deg, rgba(6,182,212,0.15), rgba(99,102,241,0.1))`,
                border: "1px solid rgba(6,182,212,0.2)",
                color: "#67e8f9",
              }}
            >
              {item.rank}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Emoji + title */}
              <div className="flex items-start gap-2 flex-wrap">
                <span className="text-base">{item.emoji}</span>
                <p className="text-sm font-bold text-white leading-snug">{item.title}</p>
              </div>

              {/* Symbol chips + badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.symbols.map((sym) => (
                  <span
                    key={sym}
                    className="px-1.5 py-0.5 rounded bg-surface-muted border border-surface-border text-[11px] font-mono text-zinc-300"
                  >
                    {sym}
                  </span>
                ))}
                {catalyst && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded border text-[10px] font-medium",
                    catalyst.color,
                  )}>
                    {catalyst.label}
                  </span>
                )}
                <ScoreLabelBadge label={item.label} size="xs" />
              </div>

              {/* Description */}
              <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
