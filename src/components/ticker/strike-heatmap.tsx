"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/formatting";
import type { HeatmapCell } from "@/types/features";

interface StrikeHeatmapProps {
  cells: HeatmapCell[][];   // rows = strikes, cols = expirations
  underlyingPrice: number;
  symbol: string;
}

function fmtOI(n: number): string {
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function fmtPremium(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function cellBg(cell: HeatmapCell): string {
  const alpha = Math.round(cell.intensity * 0.85 * 255)
    .toString(16)
    .padStart(2, "0");
  if (cell.netFlow === "call") return `#10b98100${alpha}`.slice(0, 7) + alpha; // emerald
  if (cell.netFlow === "put") return `#f43f5e${alpha}`; // rose
  return `#f59e0b${alpha}`; // amber for neutral
}

function buildCellBg(cell: HeatmapCell): string {
  const intensity = cell.intensity;
  if (cell.netFlow === "call") {
    return `rgba(16,185,129,${(intensity * 0.7).toFixed(2)})`;
  }
  if (cell.netFlow === "put") {
    return `rgba(244,63,94,${(intensity * 0.7).toFixed(2)})`;
  }
  return `rgba(245,158,11,${(intensity * 0.6).toFixed(2)})`;
}

export function StrikeHeatmap({ cells, underlyingPrice, symbol }: StrikeHeatmapProps) {
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null);

  if (!cells || cells.length === 0) return null;

  // Derive expirations from first row
  const expirations = cells[0].map((c) => c.expiration);

  // Summary stats
  const allCells = cells.flat();
  const totalCallPremium = allCells.reduce((a, c) => a + c.callPremium, 0);
  const totalPutPremium = allCells.reduce((a, c) => a + c.putPremium, 0);
  const pcRatio = totalPutPremium > 0 ? (totalCallPremium / totalPutPremium).toFixed(2) : "—";

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      <div className="flex items-center gap-4 text-xs text-zinc-400 flex-wrap">
        <span>
          <span className="text-zinc-600">Call flow </span>
          <span className="text-bull font-mono">{fmtPremium(totalCallPremium)}</span>
        </span>
        <span>
          <span className="text-zinc-600">Put flow </span>
          <span className="text-bear font-mono">{fmtPremium(totalPutPremium)}</span>
        </span>
        <span>
          <span className="text-zinc-600">C/P ratio </span>
          <span className="text-zinc-200 font-mono">{pcRatio}×</span>
        </span>
        <span className="ml-auto text-zinc-600 text-[11px]">
          Spot: <span className="text-white font-mono">${underlyingPrice.toFixed(2)}</span>
        </span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="text-[10px] font-mono border-collapse w-full min-w-[460px]">
          <thead>
            <tr>
              <th className="text-zinc-600 font-normal text-left px-2 py-1.5 w-16">
                Strike ↓ / Exp →
              </th>
              {expirations.map((exp, ci) => {
                const dte = cells[0][ci].dte;
                return (
                  <th
                    key={exp}
                    className="text-zinc-400 font-medium text-center px-1 py-1.5 whitespace-nowrap"
                  >
                    <div>{exp}</div>
                    <div className="text-zinc-600 text-[9px]">{dte}d</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {cells.map((row, ri) => {
              const strike = row[0].strike;
              const isAtm = row[0].isATM;
              const isHoveredRow = hovered?.row === ri;

              return (
                <tr
                  key={strike}
                  className={cn(
                    "border-t border-surface-border/40",
                    isAtm && "border-t border-b border-signal-cyan/40",
                  )}
                >
                  {/* Strike label */}
                  <td
                    className={cn(
                      "px-2 py-1 font-bold whitespace-nowrap",
                      isAtm ? "text-signal-cyan" : "text-zinc-400",
                    )}
                  >
                    {isAtm && <span className="mr-1 text-signal-cyan">→</span>}$
                    {strike}
                  </td>

                  {/* Cells */}
                  {row.map((cell, ci) => {
                    const isHovered = hovered?.row === ri && hovered?.col === ci;
                    const bg = buildCellBg(cell);
                    const dominant = cell.callOI >= cell.putOI ? "C" : "P";
                    const dominantColor =
                      cell.netFlow === "call"
                        ? "text-emerald-400"
                        : cell.netFlow === "put"
                          ? "text-rose-400"
                          : "text-amber-400";

                    const tooltip = [
                      `${symbol} $${cell.strike}  ${cell.expiration} (${cell.dte}d)`,
                      `Call OI: ${fmtOI(cell.callOI)}  Vol: ${fmtOI(cell.callVolume)}  ${fmtPremium(cell.callPremium)}`,
                      `Put OI:  ${fmtOI(cell.putOI)}  Vol: ${fmtOI(cell.putVolume)}  ${fmtPremium(cell.putPremium)}`,
                      `Net: ${cell.netFlow.toUpperCase()}  Intensity: ${(cell.intensity * 100).toFixed(0)}%`,
                    ].join("\n");

                    return (
                      <td
                        key={ci}
                        title={tooltip}
                        onMouseEnter={() => setHovered({ row: ri, col: ci })}
                        onMouseLeave={() => setHovered(null)}
                        style={{ backgroundColor: bg }}
                        className={cn(
                          "text-center px-1.5 py-1 cursor-default transition-opacity",
                          "border border-surface-border/20 min-w-[64px]",
                          isHovered && "ring-1 ring-white/30",
                          isHoveredRow && !isHovered && "opacity-80",
                        )}
                      >
                        {cell.callOI + cell.putOI > 0 ? (
                          <div className="flex flex-col items-center">
                            <span className={cn("font-bold text-[9px]", dominantColor)}>
                              {dominant}
                            </span>
                            <span className="text-zinc-300 text-[9px]">
                              {fmtOI(Math.max(cell.callOI, cell.putOI))}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-700">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-zinc-500 flex-wrap border-t border-surface-border/40 pt-2">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(16,185,129,0.6)" }} />
          Call Flow
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(244,63,94,0.6)" }} />
          Put Flow
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ background: "rgba(245,158,11,0.5)" }} />
          Neutral / Mixed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-0.5 bg-signal-cyan/60" />
          ATM (${underlyingPrice.toFixed(0)})
        </span>
        <span className="ml-auto text-[10px] text-zinc-600">
          Hover cell for details
        </span>
      </div>
    </div>
  );
}
