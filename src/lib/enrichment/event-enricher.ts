/**
 * Event Enricher — comprehensive event context for a signal.
 *
 * Attaches: earnings, FDA/PDUFA, FOMC, CPI, NFP, OPEX, turn-of-month proximity.
 * Determines whether option expires before/after each event.
 */

import {
  getUpcomingEventsForTicker,
  getUpcomingMacroEvents,
  getNextOpex,
  type CalendarEvent,
  type EventType,
} from "@/data/event-calendar";
import type { EventItem } from "@/types/index";

export interface EventEnrichment {
  /** All relevant events ordered by date */
  events: EnrichedEvent[];

  /** Nearest event (any type) */
  nearestEventType?: EventType;
  nearestEventName?: string;
  nearestEventDate?: Date;
  daysToNearestEvent?: number;

  /** Earnings-specific */
  daysToEarnings?: number | null;
  earningsDate?: Date | null;
  earningsBeforeExpiry: boolean;
  earningsConfirmed: boolean;

  /** FDA-specific */
  daysToFda?: number | null;
  fdaDate?: Date | null;
  fdaName?: string | null;
  fdaBeforeExpiry: boolean;

  /** Macro-specific (closest high-importance macro) */
  daysToMacro?: number | null;
  macroDate?: Date | null;
  macroName?: string | null;
  macroType?: EventType | null;

  /** OPEX proximity */
  daysToOpex?: number | null;
  opexDate?: Date | null;

  /** Derived flags */
  hasKnownCatalyst: boolean;
  isCatalystPlay: boolean;   // high-score event within DTE
  isEarningsPlay: boolean;
  isFdaPlay: boolean;
  isMacroPlay: boolean;
}

export interface EnrichedEvent extends EventItem {
  calendarId: string;
  eventType: EventType;
  beforeExpiry: boolean;
  confirmed: boolean;
  detail?: string;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

function toEventItem(ev: CalendarEvent, now: Date): EventItem {
  const date = new Date(ev.date);
  const importanceMap: Record<string, EventItem["importance"]> = {
    critical: "high", high: "high", medium: "medium", low: "low",
  };
  return {
    type: ev.type.startsWith("fda")
      ? "fda"
      : ev.type === "earnings"
      ? "earnings"
      : "macro",
    name: ev.name,
    date,
    daysAway: daysBetween(now, date),
    importance: importanceMap[ev.importance] ?? "medium",
  };
}

export function enrichEvents(
  symbol: string,
  dte: number,
  now = new Date(),
): EventEnrichment {
  const tickerEvents = getUpcomingEventsForTicker(symbol, now, Math.max(dte + 14, 60));
  const macroEvents  = getUpcomingMacroEvents(now, 14);
  const nextOpex     = getNextOpex(now);

  const enriched: EnrichedEvent[] = [];

  // Process ticker-specific events (earnings, FDA) + macro
  const allRaw = [
    ...tickerEvents,
    ...macroEvents.filter((m) => !tickerEvents.find((t) => t.id === m.id)),
  ];

  for (const ev of allRaw) {
    const date = new Date(ev.date);
    const daysAway = daysBetween(now, date);
    if (daysAway < 0) continue;
    enriched.push({
      ...toEventItem(ev, now),
      calendarId: ev.id,
      eventType: ev.type,
      beforeExpiry: daysAway <= dte,
      confirmed: ev.confirmed,
      detail: ev.detail,
    });
  }

  enriched.sort((a, b) => a.daysAway - b.daysAway);

  // ── Earnings ──────────────────────────────────────────────────────────────
  const earningsEv = enriched.find((e) => e.eventType === "earnings");
  const daysToEarnings = earningsEv?.daysAway ?? null;
  const earningsDate = earningsEv?.date ?? null;
  const earningsBeforeExpiry = earningsEv?.beforeExpiry ?? false;
  const earningsConfirmed = earningsEv?.confirmed ?? false;

  // ── FDA ───────────────────────────────────────────────────────────────────
  const fdaEv = enriched.find((e) => e.eventType === "fda_pdufa" || e.eventType === "fda_adcom");
  const daysToFda = fdaEv?.daysAway ?? null;
  const fdaDate = fdaEv?.date ?? null;
  const fdaName = fdaEv?.name ?? null;
  const fdaBeforeExpiry = fdaEv?.beforeExpiry ?? false;

  // ── Macro ─────────────────────────────────────────────────────────────────
  const macroEv = enriched.find((e) =>
    ["fomc", "cpi", "nfp", "ppi", "gdp"].includes(e.eventType),
  );
  const daysToMacro = macroEv?.daysAway ?? null;
  const macroDate = macroEv?.date ?? null;
  const macroName = macroEv?.name ?? null;
  const macroType = macroEv?.eventType ?? null;

  // ── OPEX ──────────────────────────────────────────────────────────────────
  const opexDays = nextOpex ? daysBetween(now, new Date(nextOpex.date)) : null;
  const opexDate = nextOpex ? new Date(nextOpex.date) : null;

  // ── Derived flags ─────────────────────────────────────────────────────────
  const hasKnownCatalyst =
    (daysToEarnings !== null && earningsBeforeExpiry) ||
    (daysToFda !== null && fdaBeforeExpiry) ||
    (daysToMacro !== null && (daysToMacro ?? 999) <= dte);

  const isEarningsPlay = earningsBeforeExpiry && (daysToEarnings ?? 999) <= dte;
  const isFdaPlay = fdaBeforeExpiry && (daysToFda ?? 999) <= dte;
  const isMacroPlay = (daysToMacro ?? 999) <= Math.min(dte, 10);
  const isCatalystPlay = isEarningsPlay || isFdaPlay || isMacroPlay;

  // ── Nearest event ─────────────────────────────────────────────────────────
  const nearest = enriched[0];

  return {
    events: enriched,
    nearestEventType: nearest?.eventType,
    nearestEventName: nearest?.name,
    nearestEventDate: nearest?.date,
    daysToNearestEvent: nearest?.daysAway,
    daysToEarnings, earningsDate, earningsBeforeExpiry, earningsConfirmed,
    daysToFda, fdaDate, fdaName, fdaBeforeExpiry,
    daysToMacro, macroDate, macroName, macroType,
    daysToOpex: opexDays, opexDate,
    hasKnownCatalyst, isCatalystPlay, isEarningsPlay, isFdaPlay, isMacroPlay,
  };
}
