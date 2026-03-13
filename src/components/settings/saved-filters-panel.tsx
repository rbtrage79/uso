"use client";

import { useState } from "react";
import { Bookmark, Trash2, Play, Plus, Check, X } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils/formatting";
import type { SavedFilter } from "@/types/features";

function filterSummary(f: SavedFilter): string {
  const parts: string[] = [];
  if (f.filters.direction && f.filters.direction !== "all") parts.push(f.filters.direction);
  if (f.filters.minScore) parts.push(`≥${f.filters.minScore} score`);
  if (f.filters.minPremium) {
    const p = f.filters.minPremium;
    parts.push(`≥${p >= 1_000_000 ? `$${(p / 1_000_000).toFixed(1)}M` : `$${p / 1_000}K`}`);
  }
  if (f.filters.signalType && f.filters.signalType !== "all") parts.push(f.filters.signalType);
  if (f.filters.maxDte) parts.push(`≤${f.filters.maxDte}d`);
  return parts.join(" · ") || "All signals";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function SavedFiltersPanel() {
  const { savedFilters, saveFilter, deleteSavedFilter, loadSavedFilter, filters } = useAppStore();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveFilter(trimmed, filters);
    setName("");
    setSaving(false);
  }

  return (
    <div className="space-y-3 pt-3">
      {/* Save current button */}
      {!saving ? (
        <button
          onClick={() => setSaving(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-signal-cyan/10 border border-signal-cyan/25 text-signal-cyan text-xs font-medium hover:bg-signal-cyan/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Save Current Filters
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setSaving(false); setName(""); }
            }}
            placeholder="Filter name…"
            className="flex-1 bg-surface-muted border border-surface-border rounded-md text-xs text-zinc-200 px-2.5 py-1.5 focus:outline-none focus:border-signal-cyan"
          />
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="p-1.5 rounded-md bg-bull/20 border border-bull/30 text-bull hover:bg-bull/30 disabled:opacity-40 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setSaving(false); setName(""); }}
            className="p-1.5 rounded-md bg-surface-muted border border-surface-border text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter list */}
      {savedFilters.length === 0 ? (
        <p className="text-xs text-zinc-600 py-2">No saved filters yet.</p>
      ) : (
        <div className="space-y-1">
          {savedFilters.map((sf) => (
            <div
              key={sf.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-surface-muted border border-surface-border hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Bookmark className="w-3.5 h-3.5 text-signal-cyan shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200 font-medium truncate">{sf.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-zinc-500">{filterSummary(sf)}</span>
                    <span className="text-zinc-700 text-[10px]">·</span>
                    <span className="text-[10px] text-zinc-600">{formatDate(sf.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => loadSavedFilter(sf.id)}
                  title="Load filter"
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors",
                    "bg-signal-cyan/10 border border-signal-cyan/25 text-signal-cyan hover:bg-signal-cyan/20",
                  )}
                >
                  <Play className="w-3 h-3" />
                  Load
                </button>
                <button
                  onClick={() => deleteSavedFilter(sf.id)}
                  title="Delete"
                  className="p-1.5 rounded text-zinc-600 hover:text-bear hover:bg-bear/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
