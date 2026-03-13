"use client";

/**
 * Signal Quality Dashboard
 *
 * Shows:
 *  - QC suppression breakdown by reason
 *  - Signal volume by direction (bull / bear / neutral)
 *  - Confidence bucket distribution
 *  - Score histogram
 *  - Top tickers by unusual-flow activity today
 *  - Pass / suppress ratio trend (mock sparkline)
 *
 * In production these stats come from getQCStats() + a DB aggregation.
 * In mock mode they are derived from MOCK_SIGNALS + synthetic suppression data.
 */

import { useMemo, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  BarChart2,
  Activity,
  RefreshCw,
  CheckCircle,
  XCircle,
  Info,
  Target,
} from "lucide-react";
import { MOCK_SIGNALS } from "@/data/mock-signals";
import { cn } from "@/lib/utils/formatting";

// ─── Mock QC stats (production: from getQCStats() API) ───────────────────────

const MOCK_QC_STATS = {
  total: 147,
  passed: 112,
  suppressed: 35,
  penaltiesApplied: 28,
  byReason: {
    tiny_lot:            8,
    micro_premium:       5,
    broken_quote:        3,
    stale_duplicate:    11,
    zero_oi:             2,
    weak_direction:      4,
    off_hours_low_score: 2,
    negative_dte:        0,
    implausible_iv:      0,
    implausible_premium: 0,
  } as Record<string, number>,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfidenceBucket {
  label: string;
  min: number;
  max: number;
  count: number;
  color: string;
}

interface TickerStat {
  symbol: string;
  count: number;
  totalPremium: number;
  avgScore: number;
  direction: "bullish" | "bearish" | "neutral" | "mixed";
}

// ─── Derived stats ────────────────────────────────────────────────────────────

function useQualityStats() {
  return useMemo(() => {
    const signals = MOCK_SIGNALS;

    // Direction distribution
    const bullish = signals.filter((s) => s.direction === "bullish").length;
    const bearish = signals.filter((s) => s.direction === "bearish").length;
    const neutral = signals.filter((s) => s.direction === "neutral").length;

    // Confidence buckets
    const buckets: ConfidenceBucket[] = [
      { label: "Low  (<50%)",    min: 0,    max: 0.50, count: 0, color: "bg-zinc-600" },
      { label: "Med  (50-65%)",  min: 0.50, max: 0.65, count: 0, color: "bg-amber-500" },
      { label: "High (65-80%)",  min: 0.65, max: 0.80, count: 0, color: "bg-signal-cyan" },
      { label: "Very (>80%)",    min: 0.80, max: 1.00, count: 0, color: "bg-bull" },
    ];
    signals.forEach((s) => {
      const bucket = buckets.find((b) => s.confidence >= b.min && s.confidence < b.max)
        ?? buckets[buckets.length - 1];
      bucket.count++;
    });

    // Score histogram (bins of 10)
    const scoreBins: { label: string; count: number }[] = [
      { label: "55-64", count: 0 },
      { label: "65-74", count: 0 },
      { label: "75-84", count: 0 },
      { label: "85-94", count: 0 },
      { label: "95+",   count: 0 },
    ];
    signals.forEach((s) => {
      if      (s.totalScore < 65) scoreBins[0].count++;
      else if (s.totalScore < 75) scoreBins[1].count++;
      else if (s.totalScore < 85) scoreBins[2].count++;
      else if (s.totalScore < 95) scoreBins[3].count++;
      else                        scoreBins[4].count++;
    });

    // Ticker stats
    const tickerMap = new Map<string, TickerStat>();
    signals.forEach((s) => {
      const existing = tickerMap.get(s.symbol);
      if (existing) {
        existing.count++;
        existing.totalPremium += s.totalPremium;
        existing.avgScore = Math.round((existing.avgScore + s.totalScore) / 2);
        if (existing.direction !== s.direction) existing.direction = "mixed" as "bullish";
      } else {
        tickerMap.set(s.symbol, {
          symbol: s.symbol,
          count: 1,
          totalPremium: s.totalPremium,
          avgScore: s.totalScore,
          direction: s.direction,
        });
      }
    });
    const topTickers = Array.from(tickerMap.values())
      .sort((a, b) => b.totalPremium - a.totalPremium)
      .slice(0, 8);

    // Suppression breakdown
    const suppressionRows = Object.entries(MOCK_QC_STATS.byReason)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([reason, count]) => ({
        reason,
        count,
        pct: Math.round((count / MOCK_QC_STATS.suppressed) * 100),
      }));

    const passRate = Math.round((MOCK_QC_STATS.passed / MOCK_QC_STATS.total) * 100);
    const avgScore = Math.round(signals.reduce((s, x) => s + x.totalScore, 0) / signals.length);
    const avgConfidence = Math.round(signals.reduce((s, x) => s + x.confidence, 0) / signals.length * 100);

    return {
      bullish, bearish, neutral,
      buckets, scoreBins, topTickers, suppressionRows,
      passRate, avgScore, avgConfidence,
      totalToday: MOCK_QC_STATS.total,
      suppressed: MOCK_QC_STATS.suppressed,
      passed: MOCK_QC_STATS.passed,
      penaltiesApplied: MOCK_QC_STATS.penaltiesApplied,
    };
  }, []);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function suppressionLabel(reason: string): string {
  const map: Record<string, string> = {
    tiny_lot:            "Tiny Lot",
    micro_premium:       "Micro Premium",
    broken_quote:        "Broken Quote",
    stale_duplicate:     "Stale Duplicate",
    zero_oi:             "Zero OI",
    weak_direction:      "Weak Direction",
    off_hours_low_score: "Off-Hours Low Score",
    negative_dte:        "Negative DTE",
    implausible_iv:      "Implausible IV",
    implausible_premium: "Implausible Premium",
  };
  return map[reason] ?? reason;
}

function suppressionIcon(reason: string) {
  const icons: Record<string, string> = {
    tiny_lot:            "📦",
    micro_premium:       "💰",
    broken_quote:        "⚠️",
    stale_duplicate:     "♻️",
    zero_oi:             "🕳️",
    weak_direction:      "↔️",
    off_hours_low_score: "🌙",
    negative_dte:        "⏰",
    implausible_iv:      "📈",
    implausible_premium: "🎯",
  };
  return icons[reason] ?? "❌";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color = "text-zinc-300",
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ className?: string }>; color?: string;
}) {
  return (
    <div className="bg-surface-raised border border-surface-border rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-surface-muted border border-surface-border flex items-center justify-center shrink-0">
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
        <p className={cn("text-xl font-bold font-mono", color)}>{value}</p>
        {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{title}</h2>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function BarRow({
  label, value, max, color = "bg-signal-cyan", suffix = "",
}: {
  label: string; value: number; max: number; color?: string; suffix?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs text-zinc-400 w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-zinc-300 w-12 text-right shrink-0">
        {value}{suffix}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QualityDashboardPage() {
  const stats = useQualityStats();
  const [tab, setTab] = useState<"overview" | "suppression" | "tickers">("overview");

  const dirTotal = stats.bullish + stats.bearish + stats.neutral;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-signal-cyan" />
            Signal Quality Dashboard
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Live QC pipeline metrics — today&apos;s session
          </p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised border border-surface-border text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Signals Today"
          value={stats.totalToday}
          sub="total detected"
          icon={Activity}
          color="text-signal-cyan"
        />
        <StatCard
          label="QC Pass Rate"
          value={`${stats.passRate}%`}
          sub={`${stats.passed} passed`}
          icon={CheckCircle}
          color="text-bull"
        />
        <StatCard
          label="Suppressed"
          value={stats.suppressed}
          sub={`${stats.penaltiesApplied} penalized`}
          icon={XCircle}
          color="text-bear"
        />
        <StatCard
          label="Avg Score"
          value={`${stats.avgScore}/100`}
          sub={`${stats.avgConfidence}% avg confidence`}
          icon={Target}
          color="text-amber-400"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-border pb-0">
        {(["overview", "suppression", "tickers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors capitalize",
              tab === t
                ? "border-signal-cyan text-signal-cyan"
                : "border-transparent text-zinc-500 hover:text-zinc-300",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ── */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Direction split */}
          <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
            <SectionHeader title="Direction Split" sub="Published signals by direction" />
            <div className="space-y-1">
              <BarRow
                label="🟢 Bullish"
                value={stats.bullish}
                max={dirTotal}
                color="bg-bull"
                suffix={` (${Math.round(stats.bullish / dirTotal * 100)}%)`}
              />
              <BarRow
                label="🔴 Bearish"
                value={stats.bearish}
                max={dirTotal}
                color="bg-bear"
                suffix={` (${Math.round(stats.bearish / dirTotal * 100)}%)`}
              />
              <BarRow
                label="🟡 Neutral"
                value={stats.neutral}
                max={dirTotal}
                color="bg-amber-400"
                suffix={` (${Math.round(stats.neutral / dirTotal * 100)}%)`}
              />
            </div>

            {/* Direction icons row */}
            <div className="mt-4 flex gap-3">
              <DirChip icon={TrendingUp}   label="Bullish" count={stats.bullish} color="text-bull   bg-bull/10   border-bull/20" />
              <DirChip icon={TrendingDown} label="Bearish" count={stats.bearish} color="text-bear   bg-bear/10   border-bear/20" />
              <DirChip icon={Minus}        label="Neutral" count={stats.neutral} color="text-amber-400 bg-amber-400/10 border-amber-400/20" />
            </div>
          </div>

          {/* Confidence buckets */}
          <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
            <SectionHeader title="Confidence Buckets" sub="How certain the scorer is about each signal" />
            <div className="space-y-1">
              {stats.buckets.map((b) => (
                <BarRow
                  key={b.label}
                  label={b.label}
                  value={b.count}
                  max={MOCK_SIGNALS.length}
                  color={b.color}
                />
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-3 leading-relaxed">
              High-confidence signals (&gt;65%) drive the majority of alerts. Low-confidence
              signals are penalised but not suppressed unless they also fail other QC checks.
            </p>
          </div>

          {/* Score histogram */}
          <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
            <SectionHeader title="Score Distribution" sub="Published signal scores binned by range" />
            <div className="flex items-end gap-2 h-28 mt-2">
              {stats.scoreBins.map((bin) => {
                const maxCount = Math.max(...stats.scoreBins.map((b) => b.count), 1);
                const heightPct = Math.round((bin.count / maxCount) * 100);
                return (
                  <div key={bin.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-mono text-zinc-400">{bin.count}</span>
                    <div
                      className="w-full bg-signal-cyan/30 border border-signal-cyan/20 rounded-t"
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                    />
                    <span className="text-[10px] text-zinc-500">{bin.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* QC pass / suppress ratio */}
          <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
            <SectionHeader title="QC Pipeline" sub="Today's signal processing funnel" />
            <div className="space-y-3 mt-1">
              {[
                { label: "Detected",    val: stats.totalToday, color: "bg-zinc-500",       max: stats.totalToday },
                { label: "Passed QC",   val: stats.passed,     color: "bg-signal-cyan",    max: stats.totalToday },
                { label: "Penalized",   val: stats.penaltiesApplied, color: "bg-amber-400", max: stats.totalToday },
                { label: "Suppressed",  val: stats.suppressed, color: "bg-bear",            max: stats.totalToday },
              ].map(({ label, val, color, max }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 w-24 shrink-0">{label}</span>
                  <div className="flex-1 h-3 bg-surface-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", color)}
                      style={{ width: `${Math.round((val / max) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-zinc-300 w-8 text-right">{val}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-surface-muted border border-surface-border flex items-start gap-2">
              <Info className="w-3 h-3 text-zinc-500 mt-0.5 shrink-0" />
              <p className="text-xs text-zinc-500 leading-relaxed">
                Penalized signals still publish but with a lower composite score (up to −30pts).
                Suppressed signals are dropped entirely before the feed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Suppression ── */}
      {tab === "suppression" && (
        <div className="space-y-5">

          {/* Summary banner */}
          <div className="bg-bear/5 border border-bear/20 rounded-xl p-4 flex items-center gap-4">
            <ShieldAlert className="w-8 h-8 text-bear shrink-0" />
            <div>
              <p className="text-sm font-semibold text-bear">
                {stats.suppressed} signals suppressed today ({100 - stats.passRate}% of total)
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Stale duplicates account for the largest share — normal during high-volume sessions.
              </p>
            </div>
          </div>

          {/* Breakdown table */}
          <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium w-8"></th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Suppression Reason</th>
                  <th className="text-right px-4 py-3 text-zinc-400 font-medium w-20">Count</th>
                  <th className="text-right px-4 py-3 text-zinc-400 font-medium w-20">% of Total</th>
                  <th className="px-4 py-3 w-40"></th>
                </tr>
              </thead>
              <tbody>
                {stats.suppressionRows.map(({ reason, count, pct }) => (
                  <tr key={reason} className="border-b border-surface-border last:border-0 hover:bg-surface-muted/50">
                    <td className="px-4 py-3 text-center">{suppressionIcon(reason)}</td>
                    <td className="px-4 py-3 text-zinc-200 font-medium">{suppressionLabel(reason)}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">{count}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-400">{pct}%</td>
                    <td className="px-4 py-3">
                      <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                        <div className="h-full bg-bear/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Suppression descriptions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                reason: "stale_duplicate",
                desc: "Same symbol + direction + strike seen within the dedup window (default 5 min). Prevents double-counting sweeps that arrive in multiple legs.",
              },
              {
                reason: "tiny_lot",
                desc: "Contract count below the hard floor (default: 50). Noise-floor filter to exclude retail activity and test prints.",
              },
              {
                reason: "weak_direction",
                desc: "Signal confidence below 40%. Applied when aggressor data is absent or contradictory. Penalized, not suppressed unless combined with other flags.",
              },
              {
                reason: "micro_premium",
                desc: "Total premium below $10K. Filters out LEAPS and low-delta contracts with negligible institutional interest.",
              },
            ].map(({ reason, desc }) => (
              <div key={reason} className="bg-surface-raised border border-surface-border rounded-lg p-3 flex gap-3">
                <span className="text-lg shrink-0">{suppressionIcon(reason)}</span>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">{suppressionLabel(reason)}</p>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Tickers ── */}
      {tab === "tickers" && (
        <div className="space-y-5">
          <div className="bg-surface-raised border border-surface-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-border">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Top Tickers by Unusual-Flow Activity
              </h2>
              <p className="text-xs text-zinc-600 mt-0.5">Ranked by total premium spotted today</p>
            </div>
            <div className="divide-y divide-surface-border">
              {stats.topTickers.map((t, i) => (
                <TickerRow key={t.symbol} rank={i + 1} ticker={t} />
              ))}
            </div>
          </div>

          {/* Premium bar chart for top tickers */}
          <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
            <SectionHeader title="Premium Volume by Ticker" sub="Total unusual-flow premium spotted today" />
            <div className="space-y-1 mt-1">
              {stats.topTickers.map((t) => {
                const maxPrem = Math.max(...stats.topTickers.map((x) => x.totalPremium));
                return (
                  <BarRow
                    key={t.symbol}
                    label={t.symbol}
                    value={t.totalPremium}
                    max={maxPrem}
                    color={
                      t.direction === "bullish" ? "bg-bull"
                      : t.direction === "bearish" ? "bg-bear"
                      : "bg-amber-400"
                    }
                    suffix={` ${fmt$(t.totalPremium)}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Likely false-positive section */}
          <div className="bg-surface-raised border border-surface-border rounded-xl p-5">
            <SectionHeader title="Likely False-Positive Indicators" sub="Signals that passed QC but show risk factors" />
            <div className="space-y-2 mt-1">
              {[
                {
                  icon: AlertTriangle,
                  color: "text-amber-400",
                  label: "Low-OI contracts",
                  value: "4 signals",
                  detail: "OI < 200 — may represent first-day contracts with no history",
                },
                {
                  icon: AlertTriangle,
                  color: "text-amber-400",
                  label: "Off-hours signals",
                  value: "3 signals",
                  detail: "Pre-market or after-hours prints carry less institutional conviction",
                },
                {
                  icon: AlertTriangle,
                  color: "text-amber-400",
                  label: "High-IV outliers",
                  value: "2 signals",
                  detail: "IV > 200% may indicate data feed anomaly or market maker error",
                },
                {
                  icon: BarChart2,
                  color: "text-zinc-500",
                  label: "No catalyst in window",
                  value: "5 signals",
                  detail: "eventProximity = 0 — speculative or informed flow, harder to interpret",
                },
              ].map(({ icon: Icon, color, label, value, detail }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted border border-surface-border"
                >
                  <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-zinc-200">{label}</p>
                      <span className="text-xs font-mono text-amber-400 ml-auto">{value}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DirChip({
  icon: Icon, label, count, color,
}: {
  icon: React.ComponentType<{ className?: string }>; label: string; count: number; color: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium", color)}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
      <span className="font-mono">{count}</span>
    </div>
  );
}

function TickerRow({ rank, ticker }: { rank: number; ticker: TickerStat }) {
  const dirColor =
    ticker.direction === "bullish" ? "text-bull"
    : ticker.direction === "bearish" ? "text-bear"
    : ticker.direction === "neutral" ? "text-amber-400"
    : "text-zinc-400";

  const dirEmoji =
    ticker.direction === "bullish" ? "🟢"
    : ticker.direction === "bearish" ? "🔴"
    : ticker.direction === "neutral" ? "🟡"
    : "⚪";

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-surface-muted/50 transition-colors">
      <span className="text-xs font-mono text-zinc-600 w-4 shrink-0">{rank}</span>
      <span className="text-sm font-bold font-mono text-white w-16 shrink-0">{ticker.symbol}</span>
      <span className="text-xs">{dirEmoji}</span>
      <span className={cn("text-xs font-medium capitalize", dirColor)}>{ticker.direction}</span>
      <div className="flex-1" />
      <div className="text-right">
        <p className="text-xs font-mono text-zinc-200">{fmt$(ticker.totalPremium)}</p>
        <p className="text-[10px] text-zinc-500">{ticker.count} signal{ticker.count !== 1 ? "s" : ""}</p>
      </div>
      <div className="text-right w-16 shrink-0">
        <ScorePill score={ticker.avgScore} />
      </div>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 85 ? "bg-bull/20 text-bull border-bull/30"
    : score >= 70 ? "bg-signal-cyan/20 text-signal-cyan border-signal-cyan/30"
    : "bg-surface-muted text-zinc-400 border-surface-border";
  return (
    <span className={cn("inline-block px-2 py-0.5 rounded border text-xs font-mono font-bold", color)}>
      {score}
    </span>
  );
}
