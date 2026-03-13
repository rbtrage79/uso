"use client";

import { useEffect } from "react";
import { X, ExternalLink, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedPost } from "@/types/feed";
import { ExplanationTabs } from "./explanation-tabs";
import { TagList } from "./tag-pill";
import { ConfidenceTooltip } from "./confidence-tooltip";
import { Sparkline } from "./sparkline";

function fmtPremium(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

function scoreColor(score: number) {
  if (score >= 85) return "#f97316";
  if (score >= 70) return "#eab308";
  return "#a3a3a3";
}

interface SignalDrawerProps {
  post: FeedPost | null;
  onClose: () => void;
  onTagClick?: (tag: string) => void;
}

export function SignalDrawer({ post, onClose, onTagClick }: SignalDrawerProps) {
  // Close on Escape
  useEffect(() => {
    if (!post) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [post, onClose]);

  const isOpen = !!post;

  const dirColors = {
    bullish: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
    bearish: { text: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/25" },
    neutral: { text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/25" },
  };

  const dc = post ? dirColors[post.direction] : dirColors.neutral;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-200",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-[500px] z-50 flex flex-col",
          "bg-[#0e0e16] border-l border-zinc-800/70 shadow-2xl",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {!post ? null : (
          <>
            {/* ── Drawer header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-white font-bold text-xl">{post.symbol}</span>
                <span className={cn("px-2 py-0.5 rounded border text-xs font-bold", dc.bg, dc.text, dc.border)}>
                  {post.direction.toUpperCase()}
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-medium">
                  {post.signalLabel}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
              <div className="px-5 py-4 space-y-5">

                {/* One-liner */}
                <p className="text-sm font-medium text-zinc-200 leading-snug">{post.oneLiner}</p>

                {/* Score + Sparkline row */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/60">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-500">Total Score</span>
                      <span className="font-bold text-lg tabular-nums" style={{ color: scoreColor(post.totalScore) }}>
                        {post.totalScore}
                      </span>
                      <div className="h-2 w-20 rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${post.totalScore}%`, background: `linear-gradient(90deg, #ca8a04, ${scoreColor(post.totalScore)})` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[11px]">
                      <span className="text-zinc-500">Feed <span className="text-zinc-300 font-medium">{post.feedScore}</span></span>
                      <span className="text-zinc-500">Novelty <span className="text-zinc-300 font-medium">{post.noveltyScore}</span></span>
                      <span className="text-zinc-500">Inst. <span className="text-zinc-300 font-medium">{post.institutionalScore}</span></span>
                    </div>
                  </div>
                  <Sparkline data={post.sparklineData} trend={post.sparklineTrend} width={100} height={36} />
                </div>

                {/* Contract details */}
                <Section title="Contract Details">
                  {post.isCombo ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-zinc-500 border-b border-zinc-800">
                          <th className="text-left pb-1.5">Type</th>
                          <th className="text-right pb-1.5">Strike</th>
                          <th className="text-right pb-1.5">Side</th>
                          <th className="text-right pb-1.5">Qty</th>
                          <th className="text-right pb-1.5">Premium</th>
                          <th className="text-right pb-1.5">IV</th>
                        </tr>
                      </thead>
                      <tbody className="text-zinc-300">
                        {post.legs.map((leg, i) => (
                          <tr key={i} className="border-b border-zinc-800/50">
                            <td className={cn("py-1.5 font-medium uppercase text-[11px]", leg.optionType === "call" ? "text-emerald-400" : "text-rose-400")}>
                              {leg.optionType}
                            </td>
                            <td className="py-1.5 text-right font-mono">${leg.strike}</td>
                            <td className={cn("py-1.5 text-right", leg.side === "buy" ? "text-emerald-400" : "text-rose-400")}>{leg.side}</td>
                            <td className="py-1.5 text-right tabular-nums">{leg.contracts.toLocaleString()}</td>
                            <td className="py-1.5 text-right tabular-nums">{fmtPremium(leg.premium)}</td>
                            <td className="py-1.5 text-right tabular-nums">{Math.round(leg.impliedVol * 100)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <Stat label="Strike"   value={`$${post.strike}`} />
                      <Stat label="Expiry"   value={`${post.expiration} (${post.dte}d)`} />
                      <Stat label="Type"     value={post.optionType.toUpperCase()} highlight={post.optionType === "call" ? "green" : "red"} />
                      <Stat label="Contracts" value={post.contracts.toLocaleString()} />
                      <Stat label="Premium"  value={fmtPremium(post.premium)} />
                      <Stat label="Vol/OI"   value={`${post.volOiRatio.toFixed(1)}×`} highlight={post.volOiRatio >= 3 ? "amber" : "none"} />
                      <Stat label="IV"       value={`${Math.round(post.impliedVol * 100)}%`} highlight={post.impliedVol > 0.8 ? "amber" : "none"} />
                      {post.delta !== undefined && <Stat label="Delta" value={`δ${Math.abs(post.delta).toFixed(2)}`} />}
                      {post.underlyingPrice && <Stat label="Underlying" value={`$${post.underlyingPrice.toFixed(2)}`} />}
                    </div>
                  )}
                </Section>

                {/* Merged prints */}
                {post.mergedCount && post.mergedCount > 1 && (
                  <Section title={`Merged Prints (${post.mergedCount} total)`}>
                    <div className="space-y-1.5 text-xs text-zinc-400">
                      {post.mergedPrints?.map((mp, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-zinc-800/50 pb-1">
                          <span>{mp.timeAgo}</span>
                          <span>{mp.contracts.toLocaleString()} cts</span>
                          <span className="text-zinc-300">{fmtPremium(mp.premium)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-0.5 font-medium text-zinc-200">
                        <span>Total accumulated</span>
                        <span>{post.contracts.toLocaleString()} cts</span>
                        <span>{fmtPremium(post.premium)}</span>
                      </div>
                    </div>
                  </Section>
                )}

                {/* Explanation */}
                <Section title="Explanation">
                  <ExplanationTabs explanations={post.explanations} />
                </Section>

                {/* Events */}
                {post.events.length > 0 && (
                  <Section title="Event Context">
                    <div className="space-y-2">
                      {post.events.map((ev) => (
                        <div key={ev.label} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span>{ev.emoji}</span>
                            <span className="text-zinc-300">{ev.label}</span>
                            {ev.beforeExpiry && (
                              <span className="px-1 py-0.5 rounded bg-emerald-900/30 text-emerald-400 text-[10px] border border-emerald-800/30">
                                within expiry
                              </span>
                            )}
                          </div>
                          <span className={cn(
                            "font-medium tabular-nums",
                            ev.daysAway <= 3 ? "text-red-400" : ev.daysAway <= 7 ? "text-amber-400" : "text-zinc-400",
                          )}>
                            {ev.daysAway}d
                          </span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Peers */}
                {(post.activePeers.length > 0 || post.etfMembership.length > 0) && (
                  <Section title="Context">
                    {post.activePeers.length > 0 && (
                      <div className="mb-2">
                        <div className="text-[11px] text-zinc-500 mb-1">Active peers (also seeing flow)</div>
                        <div className="flex flex-wrap gap-1.5">
                          {post.activePeers.map(p => (
                            <span key={p} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs border border-zinc-700">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {post.etfMembership.length > 0 && (
                      <div>
                        <div className="text-[11px] text-zinc-500 mb-1">ETF membership</div>
                        <div className="flex flex-wrap gap-1.5">
                          {post.etfMembership.map(e => (
                            <span key={e} className="px-2 py-0.5 rounded bg-cyan-900/30 text-cyan-300 text-xs border border-cyan-800/30">{e}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {post.primaryTheme && (
                      <div className="mt-2 text-xs text-zinc-400">
                        Theme: <span className="text-zinc-200">{post.primaryThemeEmoji} {post.primaryTheme}</span>
                        {post.primaryFactor && (
                          <> · Factor: <span className="text-zinc-200">{post.primaryFactorEmoji} {post.primaryFactor}</span></>
                        )}
                      </div>
                    )}
                  </Section>
                )}

                {/* Tags */}
                <Section title="Tags">
                  <TagList tags={post.tags} max={20} size="sm" onTagClick={onTagClick} />
                </Section>

                {/* Footer */}
                <div className="space-y-2 pt-1 border-t border-zinc-800/50">
                  <ConfidenceTooltip post={post} />
                  <a
                    href={`/feed/${post.symbol}`}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View all {post.symbol} signals <ChevronRight size={12} />
                  </a>
                  <p className="text-[10px] text-zinc-700 leading-relaxed">
                    ⚠️ This information is for educational and informational purposes only. It does not constitute financial advice, investment recommendations, or solicitation to buy or sell any securities. Options trading involves significant risk and may not be suitable for all investors.
                  </p>
                </div>

              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function Stat({ label, value, highlight = "none" }: { label: string; value: string; highlight?: "green" | "red" | "amber" | "none" }) {
  const vc = highlight === "green" ? "text-emerald-400" : highlight === "red" ? "text-rose-400" : highlight === "amber" ? "text-amber-400" : "text-zinc-200";
  return (
    <div className="p-2 rounded-lg bg-zinc-800/40 border border-zinc-800/60">
      <div className="text-[10px] text-zinc-500 mb-0.5">{label}</div>
      <div className={cn("text-xs font-semibold", vc)}>{value}</div>
    </div>
  );
}
