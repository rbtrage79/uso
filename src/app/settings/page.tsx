"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import {
  Settings2,
  RefreshCw,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { DEFAULT_SETTINGS } from "@/types/index";
import { cn } from "@/lib/utils/formatting";
import { SavedFiltersPanel } from "@/components/settings/saved-filters-panel";
import { AlertSubscriptionsPanel } from "@/components/settings/alert-subscriptions-panel";

// ─── UI helpers ───────────────────────────────────────────────────────────────

function Section({
  title, description, children, collapsible = false,
}: {
  title: string; description?: string; children: React.ReactNode; collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
      <button
        className={cn(
          "w-full flex items-center justify-between px-5 py-4",
          collapsible ? "cursor-pointer hover:bg-surface-muted/40" : "cursor-default",
        )}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      >
        <div className="text-left">
          <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">{title}</h2>
          {description && (
            <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          )}
        </div>
        {collapsible && (
          open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>
      {open && <div className="px-5 pb-5 space-y-1 border-t border-surface-border">{children}</div>}
    </div>
  );
}

function ToggleRow({
  label, description, value, onChange, tip,
}: {
  label: string; description?: string; value: boolean;
  onChange: (v: boolean) => void; tip?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-surface-border last:border-0 gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-zinc-200">{label}</p>
          {tip && (
            <span title={tip} className="cursor-help">
              <Info className="w-3 h-3 text-zinc-600" />
            </span>
          )}
        </div>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        aria-label={label}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${value ? "bg-signal-cyan" : "bg-surface-muted border border-surface-border"}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}

function SliderRow({
  label, value, min, max, step, format, onChange, tip, description,
}: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void;
  tip?: string; description?: string;
}) {
  return (
    <div className="py-3 border-b border-surface-border last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-zinc-200">{label}</p>
          {tip && (
            <span title={tip} className="cursor-help">
              <Info className="w-3 h-3 text-zinc-600" />
            </span>
          )}
        </div>
        <span className="text-xs font-mono text-signal-cyan tabular-nums">{format(value)}</span>
      </div>
      {description && <p className="text-xs text-zinc-500 mb-2">{description}</p>}
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-signal-cyan h-1.5 cursor-pointer"
      />
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-zinc-600">{format(min)}</span>
        <span className="text-[10px] text-zinc-600">{format(max)}</span>
      </div>
    </div>
  );
}

function SelectRow({
  label, value, options, onChange, description, tip,
}: {
  label: string; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void; description?: string; tip?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-surface-border last:border-0 gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-zinc-200">{label}</p>
          {tip && <span title={tip} className="cursor-help"><Info className="w-3 h-3 text-zinc-600" /></span>}
        </div>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface-muted border border-surface-border rounded-md text-xs text-zinc-200 px-2 py-1.5 shrink-0 focus:outline-none focus:border-signal-cyan cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Divider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {label && <span className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</span>}
      <div className="flex-1 h-px bg-surface-border" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { settings, updateSettings, watchlist, removeFromWatchlist } = useAppStore();
  const [resetDone, setResetDone] = useState(false);

  function handleReset() {
    updateSettings(DEFAULT_SETTINGS);
    setResetDone(true);
    setTimeout(() => setResetDone(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-signal-cyan" />
            Settings
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            All detection thresholds, QC parameters, and display preferences
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised border border-surface-border text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {resetDone
            ? <><RefreshCw className="w-3 h-3 text-bull" /> Reset done</>
            : <><RotateCcw className="w-3 h-3" /> Restore defaults</>
          }
        </button>
      </div>

      {/* ── Data Source ── */}
      <Section title="Data Source" description="Toggle between live Polygon feed and synthetic mock data">
        <ToggleRow
          label="Mock Mode"
          description="Use synthetic data instead of live Polygon feed"
          value={settings.mockMode}
          onChange={(v) => updateSettings({ mockMode: v })}
          tip="When enabled, no API keys are required. All data is procedurally generated."
        />
      </Section>

      {/* ── Noise Filters ── */}
      <Section title="Noise Filters" description="Hard gates applied before scoring">
        <SliderRow
          label="Minimum Signal Score"
          value={settings.minSignalScore}
          min={30} max={90} step={5}
          format={(v) => `${v}/100`}
          onChange={(v) => updateSettings({ minSignalScore: v })}
          description="Only show signals at or above this composite score in the feed"
        />
        <SliderRow
          label="Minimum Notional Premium"
          value={settings.minNotional}
          min={10_000} max={1_000_000} step={10_000}
          format={(v) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`}
          onChange={(v) => updateSettings({ minNotional: v })}
          description="Filters out retail noise. Default $50K focuses on institutional-size flow."
        />
        <SliderRow
          label="Minimum Contracts"
          value={settings.minContracts}
          min={10} max={1_000} step={10}
          format={(v) => `${v} cts`}
          onChange={(v) => updateSettings({ minContracts: v })}
          description="Hard floor for contract count. Below this = noise or retail prints."
        />
        <SliderRow
          label="Maximum DTE"
          value={settings.maxDte}
          min={1} max={180} step={7}
          format={(v) => `${v}d`}
          onChange={(v) => updateSettings({ maxDte: v })}
          description="Ignore far-dated options (LEAPS). Most unusual flow targets 7-90 DTE."
        />
      </Section>

      {/* ── Vol/OI Sensitivity ── */}
      <Section title="Vol/OI Sensitivity" description="Ratio thresholds for Volume÷Open Interest anomaly detection" collapsible>
        <p className="text-xs text-zinc-500 pt-3 pb-1">
          A vol/OI ratio above 1.0 means more contracts traded today than existed at yesterday&apos;s close — a
          strong indicator of new positioning. Adjust sensitivity to tune alert frequency.
        </p>
        <SliderRow
          label="Noteworthy Threshold"
          value={settings.volOiNoteworthy}
          min={0.1} max={1.0} step={0.1}
          format={(v) => `${v.toFixed(1)}×`}
          onChange={(v) => updateSettings({ volOiNoteworthy: v })}
          tip="Vol/OI above this adds a small score boost. Default: 0.5×"
        />
        <SliderRow
          label="Unusual Threshold"
          value={settings.volOiUnusual}
          min={0.5} max={3.0} step={0.1}
          format={(v) => `${v.toFixed(1)}×`}
          onChange={(v) => updateSettings({ volOiUnusual: v })}
          tip="Vol/OI above this = 'unusual' label. Default: 1.0× (volume exceeds OI)"
        />
        <SliderRow
          label="Extreme Threshold"
          value={settings.volOiExtreme}
          min={1.0} max={10.0} step={0.5}
          format={(v) => `${v.toFixed(1)}×`}
          onChange={(v) => updateSettings({ volOiExtreme: v })}
          tip="Vol/OI above this = max score for this dimension. Default: 2.5×"
        />
      </Section>

      {/* ── Notional Size Tiers ── */}
      <Section title="Notional Size Tiers" description="Dollar thresholds used for badge labelling and scorecard" collapsible>
        <p className="text-xs text-zinc-500 pt-3 pb-1">
          These thresholds control how the premium size is labelled in the feed card.
          Adjust to match the tickers you follow (e.g. lower for small-caps).
        </p>
        <SliderRow
          label="Large Tier"
          value={settings.notionalLarge}
          min={50_000} max={1_000_000} step={50_000}
          format={(v) => `$${(v / 1_000).toFixed(0)}K`}
          onChange={(v) => updateSettings({ notionalLarge: v })}
          tip="Below this = standard. Above = 'Large' badge."
        />
        <SliderRow
          label="Huge Tier"
          value={settings.notionalHuge}
          min={500_000} max={5_000_000} step={100_000}
          format={(v) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`}
          onChange={(v) => updateSettings({ notionalHuge: v })}
          tip="Above this = 'Huge' / whale-tier badge."
        />
        <SliderRow
          label="Whale Tier"
          value={settings.notionalWhale}
          min={1_000_000} max={20_000_000} step={500_000}
          format={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
          onChange={(v) => updateSettings({ notionalWhale: v })}
          tip="Above this = '🐳 Whale' badge. Default: $5M"
        />
      </Section>

      {/* ── Quality Control ── */}
      <Section title="Quality Control" description="Pre-publication signal filtering and penalty thresholds" collapsible>
        <Divider label="Hard gates" />
        <SliderRow
          label="Off-Hours Min Score"
          value={settings.offHoursMinScore}
          min={50} max={90} step={5}
          format={(v) => `${v}/100`}
          onChange={(v) => updateSettings({ offHoursMinScore: v })}
          description="Minimum score required to publish signals detected outside market hours (pre-market / after-hours)"
          tip="Pre-market and after-hours flow has less conviction — apply a higher bar."
        />
        <SliderRow
          label="Dedup Window"
          value={settings.dedupWindowMinutes}
          min={1} max={30} step={1}
          format={(v) => `${v} min`}
          onChange={(v) => updateSettings({ dedupWindowMinutes: v })}
          description="How long to suppress a repeat signal on the same contract and direction"
        />
        <SliderRow
          label="Publication Gate"
          value={settings.minPublishScore}
          min={40} max={90} step={5}
          format={(v) => `${v}/100`}
          onChange={(v) => updateSettings({ minPublishScore: v })}
          description="Composite score required before a signal enters the feed"
        />

        <Divider label="Soft filters" />
        <ToggleRow
          label="Suppress Tiny Lots"
          description="Filter out signals with fewer than the soft contract floor (100 cts)"
          value={settings.suppressTinyLot}
          onChange={(v) => updateSettings({ suppressTinyLot: v })}
          tip="Tiny lots may still pass with a score penalty. Toggle this to suppress them entirely."
        />
        <ToggleRow
          label="Suppress Duplicates"
          description="Deduplicate repeat signals within the dedup window above"
          value={settings.suppressDuplicates}
          onChange={(v) => updateSettings({ suppressDuplicates: v })}
          tip="Sweeps often arrive as multiple fills for the same order. This collapses them."
        />
      </Section>

      {/* ── Breaking Alerts ── */}
      <Section title="Breaking Alerts" description="Sensitivity preset controls when a signal triggers a BREAKING banner">
        <SelectRow
          label="Breaking Sensitivity"
          value={settings.breakingSensitivity}
          options={[
            { value: "low",    label: "🔇 Low — Only whale prints (score ≥ 88)" },
            { value: "medium", label: "🔔 Medium — High-conviction flow (score ≥ 80)" },
            { value: "high",   label: "🚨 High — All notable signals (score ≥ 70)" },
          ]}
          onChange={(v) => updateSettings({ breakingSensitivity: v as "low" | "medium" | "high" })}
          description="Higher sensitivity = more breaking banners. Lower = only the most significant prints."
        />
      </Section>

      {/* ── Display / Alerts ── */}
      <Section title="Display & Alerts" description="UI preferences and notification settings">
        <ToggleRow
          label="Sound Alerts"
          description="Play a tone when a high-score signal is detected"
          value={settings.soundAlerts}
          onChange={(v) => updateSettings({ soundAlerts: v })}
        />
        <SliderRow
          label="Alert Score Threshold"
          value={settings.alertThreshold}
          min={55} max={95} step={5}
          format={(v) => `${v}/100`}
          onChange={(v) => updateSettings({ alertThreshold: v })}
          description="Minimum score to trigger an audio alert"
        />
        <ToggleRow
          label="Auto Refresh"
          description="Automatically poll for new signals"
          value={settings.autoRefresh}
          onChange={(v) => updateSettings({ autoRefresh: v })}
        />
        <SliderRow
          label="Refresh Interval"
          value={settings.refreshInterval}
          min={5} max={120} step={5}
          format={(v) => `${v}s`}
          onChange={(v) => updateSettings({ refreshInterval: v })}
          description="How often to check for new signals when auto-refresh is enabled"
        />
      </Section>

      {/* ── Saved Filters ── */}
      <Section title="Saved Filters" description="Save and load filter presets for quick access" collapsible>
        <div className="pt-3">
          <SavedFiltersPanel />
        </div>
      </Section>

      {/* ── Alert Subscriptions ── */}
      <Section title="Alert Subscriptions" description="Configure per-symbol and label-type alerts" collapsible>
        <div className="pt-3">
          <AlertSubscriptionsPanel />
        </div>
      </Section>

      {/* ── Watchlist ── */}
      <Section title="Watchlist" description="Symbols receiving priority highlighting in the feed">
        {watchlist.length === 0 ? (
          <p className="text-xs text-zinc-500 py-3">No symbols in watchlist.</p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-3">
            {watchlist.map((sym) => (
              <div
                key={sym}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-muted border border-surface-border text-xs font-mono text-zinc-300"
              >
                {sym}
                <button
                  onClick={() => removeFromWatchlist(sym)}
                  className="text-zinc-500 hover:text-bear transition-colors ml-1"
                  title={`Remove ${sym}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Footer note */}
      <p className="text-xs text-zinc-600 text-center pb-2">
        All settings are saved to localStorage and persist across sessions.
        Use &quot;Restore defaults&quot; to reset everything.
      </p>
    </div>
  );
}
