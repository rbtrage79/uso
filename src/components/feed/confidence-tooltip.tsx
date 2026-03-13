"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedPost } from "@/types/feed";

interface ConfidenceTooltipProps {
  post: Pick<FeedPost, "confidence" | "totalScore" | "noveltyScore" | "institutionalScore" | "unusualness">;
}

export function ConfidenceTooltip({ post }: ConfidenceTooltipProps) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(post.confidence * 100);

  const confColor =
    pct >= 80 ? "text-emerald-400" :
    pct >= 65 ? "text-amber-400" : "text-zinc-400";

  return (
    <div className="relative inline-flex items-center gap-1">
      <span className={cn("text-[11px] font-medium tabular-nums", confColor)}>
        {pct}% confidence
      </span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        <Info size={11} />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* tooltip panel */}
          <div className="absolute bottom-full left-0 mb-2 z-50 w-64 rounded-lg border border-zinc-700/60 bg-[#16161f] p-3 shadow-2xl text-[11px]">
            <div className="font-semibold text-zinc-200 mb-2">How confidence is calculated</div>
            <div className="space-y-1.5 text-zinc-400">
              <Row label="Unusual Score"      value={post.totalScore}           max={100} />
              <Row label="Novelty Score"      value={post.noveltyScore}         max={100} />
              <Row label="Institutional Look" value={post.institutionalScore}   max={100} />
              <div className="pt-1 border-t border-zinc-800 text-zinc-500">
                Unusualness tier: <span className="text-zinc-300 capitalize">{post.unusualness}</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-zinc-800 text-[10px] text-zinc-600">
              Not financial advice. For informational purposes only.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="h-1 w-16 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full rounded-full bg-amber-500/70" style={{ width: `${pct}%` }} />
        </div>
        <span className="tabular-nums text-zinc-300 w-6 text-right">{value}</span>
      </div>
    </div>
  );
}
