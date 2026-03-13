import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDollar(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function formatPct(n: number, decimals = 1): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`;
}

export function formatNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatIV(iv: number): string {
  return `${(iv * 100).toFixed(1)}%`;
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-signal-gold";
  if (score >= 65) return "text-bull";
  if (score >= 50) return "text-signal-cyan";
  return "text-zinc-400";
}

export function directionColor(direction: string): string {
  if (direction === "bullish") return "text-bull";
  if (direction === "bearish") return "text-bear";
  if (direction === "neutral") return "text-signal-gold";
  return "text-zinc-400";
}

export function directionBg(direction: string): string {
  if (direction === "bullish") return "bg-bull/10 border-bull/30";
  if (direction === "bearish") return "bg-bear/10 border-bear/30";
  if (direction === "neutral") return "bg-signal-gold/10 border-signal-gold/30";
  return "bg-zinc-800/50 border-zinc-700";
}
