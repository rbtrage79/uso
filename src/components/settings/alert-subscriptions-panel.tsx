"use client";

import { useState } from "react";
import { Bell, BellOff, Trash2, Plus, X } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { ScoreLabelBadge } from "@/components/shared/score-label-badge";
import { SCORE_LABEL_META } from "@/types/features";
import { cn } from "@/lib/utils/formatting";
import type { AlertSubscription, ScoreLabel, AlertChannel } from "@/types/features";

const ALL_LABELS = Object.keys(SCORE_LABEL_META) as ScoreLabel[];

const DIR_OPTIONS = [
  { value: "", label: "Any direction" },
  { value: "bullish", label: "Bullish only" },
  { value: "bearish", label: "Bearish only" },
  { value: "neutral", label: "Neutral only" },
];

const CHANNEL_OPTIONS: AlertChannel[] = ["in-app", "browser", "email"];

interface NewAlertForm {
  name: string;
  symbol: string;
  threshold: number;
  direction: string;
  labelTypes: ScoreLabel[];
  channels: AlertChannel[];
}

const DEFAULT_FORM: NewAlertForm = {
  name: "",
  symbol: "",
  threshold: 75,
  direction: "",
  labelTypes: [],
  channels: ["in-app"],
};

export function AlertSubscriptionsPanel() {
  const { alertSubscriptions, addAlertSubscription, updateAlertSubscription, deleteAlertSubscription } =
    useAppStore();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<NewAlertForm>(DEFAULT_FORM);

  function handleSave() {
    if (!form.name.trim()) return;
    addAlertSubscription({
      name: form.name.trim(),
      symbol: form.symbol.trim().toUpperCase() || undefined,
      threshold: form.threshold,
      direction: form.direction
        ? (form.direction as AlertSubscription["direction"])
        : undefined,
      labelTypes: form.labelTypes,
      channels: form.channels,
      enabled: true,
    });
    setAdding(false);
    setForm(DEFAULT_FORM);
  }

  function toggleLabel(lbl: ScoreLabel) {
    setForm((f) => ({
      ...f,
      labelTypes: f.labelTypes.includes(lbl)
        ? f.labelTypes.filter((l) => l !== lbl)
        : [...f.labelTypes, lbl],
    }));
  }

  function toggleChannel(ch: AlertChannel) {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch)
        ? f.channels.filter((c) => c !== ch)
        : [...f.channels, ch],
    }));
  }

  return (
    <div className="space-y-3 pt-3">
      {/* Add alert button */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-signal-gold/10 border border-signal-gold/25 text-signal-gold text-xs font-medium hover:bg-signal-gold/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Alert
        </button>
      )}

      {/* Add form */}
      {adding && (
        <div className="rounded-lg border border-surface-border bg-surface-muted p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">New Alert</p>
            <button onClick={() => { setAdding(false); setForm(DEFAULT_FORM); }} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">Alert Name *</label>
            <input
              autoFocus
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. NVDA Whale Prints"
              className="w-full bg-surface-raised border border-surface-border rounded-md text-xs text-zinc-200 px-2.5 py-1.5 focus:outline-none focus:border-signal-cyan"
            />
          </div>

          {/* Symbol + Direction row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Symbol (optional)</label>
              <input
                type="text"
                value={form.symbol}
                onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                placeholder="AAPL"
                className="w-full bg-surface-raised border border-surface-border rounded-md text-xs text-zinc-200 px-2.5 py-1.5 focus:outline-none focus:border-signal-cyan"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Direction</label>
              <select
                value={form.direction}
                onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value }))}
                className="w-full bg-surface-raised border border-surface-border rounded-md text-xs text-zinc-200 px-2.5 py-1.5 focus:outline-none focus:border-signal-cyan cursor-pointer"
              >
                {DIR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Threshold */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-zinc-500">Min Score</label>
              <span className="text-xs font-mono text-signal-cyan">{form.threshold}/100</span>
            </div>
            <input
              type="range"
              min={50} max={95} step={5}
              value={form.threshold}
              onChange={(e) => setForm((f) => ({ ...f, threshold: Number(e.target.value) }))}
              className="w-full accent-signal-cyan h-1.5 cursor-pointer"
            />
          </div>

          {/* Channels */}
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1.5">Channels</label>
            <div className="flex gap-2">
              {CHANNEL_OPTIONS.map((ch) => (
                <button
                  key={ch}
                  onClick={() => toggleChannel(ch)}
                  className={cn(
                    "px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors capitalize",
                    form.channels.includes(ch)
                      ? "bg-signal-cyan/15 border-signal-cyan/30 text-signal-cyan"
                      : "bg-surface-raised border-surface-border text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {/* Label types */}
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1.5">
              Label Types <span className="text-zinc-600">(empty = any)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_LABELS.map((lbl) => (
                <button
                  key={lbl}
                  onClick={() => toggleLabel(lbl)}
                  className={cn(
                    "transition-opacity",
                    !form.labelTypes.includes(lbl) && "opacity-40 hover:opacity-70",
                  )}
                >
                  <ScoreLabelBadge label={lbl} size="sm" />
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={!form.name.trim()}
              className="px-3 py-1.5 rounded-lg bg-bull/20 border border-bull/30 text-bull text-xs font-medium hover:bg-bull/30 disabled:opacity-40 transition-colors"
            >
              Save Alert
            </button>
            <button
              onClick={() => { setAdding(false); setForm(DEFAULT_FORM); }}
              className="px-3 py-1.5 rounded-lg bg-surface-raised border border-surface-border text-zinc-400 text-xs hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Alert list */}
      {alertSubscriptions.length === 0 ? (
        <p className="text-xs text-zinc-600 py-2">No alert subscriptions yet.</p>
      ) : (
        <div className="space-y-1">
          {alertSubscriptions.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg bg-surface-muted border border-surface-border"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {/* Enabled toggle */}
                <button
                  onClick={() => updateAlertSubscription(alert.id, { enabled: !alert.enabled })}
                  title={alert.enabled ? "Disable" : "Enable"}
                  className={cn(
                    "mt-0.5 shrink-0 transition-colors",
                    alert.enabled ? "text-signal-gold" : "text-zinc-600 hover:text-zinc-400",
                  )}
                >
                  {alert.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn("text-sm font-medium", alert.enabled ? "text-zinc-200" : "text-zinc-500")}>
                      {alert.name}
                    </p>
                    {alert.symbol && (
                      <span className="px-1.5 py-0.5 rounded bg-surface-raised border border-surface-border text-[10px] font-mono text-zinc-300">
                        {alert.symbol}
                      </span>
                    )}
                    {alert.direction && (
                      <span className={cn(
                        "text-[10px] font-medium capitalize px-1.5 py-0.5 rounded border",
                        alert.direction === "bullish" ? "text-bull bg-bull/10 border-bull/20"
                        : alert.direction === "bearish" ? "text-bear bg-bear/10 border-bear/20"
                        : "text-amber-400 bg-amber-400/10 border-amber-400/20",
                      )}>
                        {alert.direction}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-zinc-600">
                      Score ≥ <span className="text-zinc-400 font-mono">{alert.threshold}</span>
                    </span>
                    <span className="text-zinc-700">·</span>
                    <span className="text-[10px] text-zinc-600">
                      {alert.channels.join(", ")}
                    </span>
                  </div>

                  {alert.labelTypes.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {alert.labelTypes.map((lbl) => (
                        <ScoreLabelBadge key={lbl} label={lbl} size="xs" />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => deleteAlertSubscription(alert.id)}
                title="Delete alert"
                className="shrink-0 p-1.5 rounded text-zinc-600 hover:text-bear hover:bg-bear/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
