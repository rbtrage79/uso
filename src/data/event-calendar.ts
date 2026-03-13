/**
 * Event calendar data — earnings, FDA/PDUFA, macro events.
 *
 * In production replace with real API queries:
 *   - Earnings: Polygon /v3/reference/financials or Quandl ZACKS/EARN
 *   - FDA: Biopharmcatalyst.com API or manual DB
 *   - Macro: econdb.com / BLS / FRED scheduled releases
 */

export type EventType =
  | "earnings"
  | "fda_pdufa"
  | "fda_adcom"
  | "fomc"
  | "cpi"
  | "ppi"
  | "nfp"
  | "gdp"
  | "opex"           // monthly options expiration
  | "quarterly_opex" // triple/quad witching
  | "turn_of_month"  // last/first 2 trading days
  | "other_macro";

export type EventImportance = "critical" | "high" | "medium" | "low";

export interface CalendarEvent {
  id: string;
  type: EventType;
  name: string;
  date: string;       // ISO YYYY-MM-DD
  importance: EventImportance;
  /** Tickers specifically affected (empty = market-wide) */
  tickers?: string[];
  /** Optional detail (drug name, drug company, quarter label, etc.) */
  detail?: string;
  confirmed: boolean;
}

// ─── Earnings calendar ────────────────────────────────────────────────────────
// Updated for 2026 Q1 cycle (illustrative; update per actual schedule)
export const EARNINGS_CALENDAR: CalendarEvent[] = [
  { id: "earn-aapl-q1-26",  type: "earnings", name: "AAPL Earnings Q1'26",  date: "2026-01-30", importance: "critical", tickers: ["AAPL"],  confirmed: true },
  { id: "earn-msft-q2-26",  type: "earnings", name: "MSFT Earnings Q2'26",  date: "2026-01-29", importance: "critical", tickers: ["MSFT"],  confirmed: true },
  { id: "earn-meta-q4-25",  type: "earnings", name: "META Earnings Q4'25",  date: "2026-01-29", importance: "critical", tickers: ["META"],  confirmed: true },
  { id: "earn-nvda-q4-25",  type: "earnings", name: "NVDA Earnings Q4'25",  date: "2026-02-26", importance: "critical", tickers: ["NVDA"],  confirmed: true },
  { id: "earn-tsla-q4-25",  type: "earnings", name: "TSLA Earnings Q4'25",  date: "2026-01-22", importance: "critical", tickers: ["TSLA"],  confirmed: true },
  { id: "earn-amzn-q4-25",  type: "earnings", name: "AMZN Earnings Q4'25",  date: "2026-02-06", importance: "critical", tickers: ["AMZN"],  confirmed: true },
  { id: "earn-amd-q4-25",   type: "earnings", name: "AMD Earnings Q4'25",   date: "2026-01-28", importance: "high",     tickers: ["AMD"],   confirmed: true },
  { id: "earn-googl-q4-25", type: "earnings", name: "GOOGL Earnings Q4'25", date: "2026-02-04", importance: "critical", tickers: ["GOOGL", "GOOG"], confirmed: true },
  { id: "earn-mrna-q4-25",  type: "earnings", name: "MRNA Earnings Q4'25",  date: "2026-02-13", importance: "high",     tickers: ["MRNA"],  confirmed: false },
  { id: "earn-xom-q4-25",   type: "earnings", name: "XOM Earnings Q4'25",   date: "2026-02-04", importance: "medium",   tickers: ["XOM"],   confirmed: true },
  { id: "earn-jpm-q4-25",   type: "earnings", name: "JPM Earnings Q4'25",   date: "2026-01-14", importance: "high",     tickers: ["JPM"],   confirmed: true },
  { id: "earn-crm-q4-25",   type: "earnings", name: "CRM Earnings Q4'25",   date: "2026-02-26", importance: "medium",   tickers: ["CRM"],   confirmed: false },
  { id: "earn-smci-q2-26",  type: "earnings", name: "SMCI Earnings Q2'26",  date: "2026-02-11", importance: "medium",   tickers: ["SMCI"],  confirmed: false },
  { id: "earn-pltr-q4-25",  type: "earnings", name: "PLTR Earnings Q4'25",  date: "2026-02-03", importance: "medium",   tickers: ["PLTR"],  confirmed: true },
  { id: "earn-nvo-q4-25",   type: "earnings", name: "NVO Earnings Q4'25",   date: "2026-02-05", importance: "high",     tickers: ["NVO"],   confirmed: false },
  { id: "earn-lly-q4-25",   type: "earnings", name: "LLY Earnings Q4'25",   date: "2026-02-05", importance: "high",     tickers: ["LLY"],   confirmed: false },
];

// ─── FDA/PDUFA calendar ───────────────────────────────────────────────────────
export const FDA_CALENDAR: CalendarEvent[] = [
  {
    id: "fda-mrna-rsv-1",
    type: "fda_pdufa",
    name: "MRNA mRNA-1345 PDUFA (RSV Adult)",
    date: "2026-03-20",
    importance: "critical",
    tickers: ["MRNA"],
    detail: "mRNA-1345 RSV vaccine (adult); FDA PDUFA action date",
    confirmed: true,
  },
  {
    id: "fda-lly-orfor-1",
    type: "fda_pdufa",
    name: "LLY Orforglipron PDUFA",
    date: "2026-04-10",
    importance: "critical",
    tickers: ["LLY"],
    detail: "Oral GLP-1 for obesity/T2D; potential $50B+ opportunity",
    confirmed: false,
  },
  {
    id: "fda-nvo-cagri-1",
    type: "fda_pdufa",
    name: "NVO CagriSema PDUFA",
    date: "2026-05-15",
    importance: "high",
    tickers: ["NVO"],
    detail: "CagriSema combination obesity drug",
    confirmed: false,
  },
  {
    id: "fda-xbi-adcom-1",
    type: "fda_adcom",
    name: "FDA AdCom — Novel CRISPR Therapy",
    date: "2026-03-15",
    importance: "high",
    tickers: ["CRSP", "EDIT", "NTLA", "XBI"],
    detail: "Advisory committee review — sector-wide read-through",
    confirmed: true,
  },
  {
    id: "fda-blue-1",
    type: "fda_pdufa",
    name: "BLUE bb2121 PDUFA",
    date: "2026-02-28",
    importance: "medium",
    tickers: ["BLUE"],
    detail: "Gene therapy for sickle cell disease",
    confirmed: false,
  },
];

// ─── Macro event calendar ─────────────────────────────────────────────────────
export const MACRO_CALENDAR: CalendarEvent[] = [
  // FOMC
  { id: "fomc-jan-26",  type: "fomc",      name: "FOMC Rate Decision",   date: "2026-01-29", importance: "critical", confirmed: true },
  { id: "fomc-mar-26",  type: "fomc",      name: "FOMC Rate Decision",   date: "2026-03-19", importance: "critical", confirmed: true },
  { id: "fomc-may-26",  type: "fomc",      name: "FOMC Rate Decision",   date: "2026-05-07", importance: "critical", confirmed: true },

  // CPI
  { id: "cpi-jan-26",   type: "cpi",       name: "CPI Release (Jan)",    date: "2026-02-12", importance: "high",     confirmed: true },
  { id: "cpi-feb-26",   type: "cpi",       name: "CPI Release (Feb)",    date: "2026-03-12", importance: "high",     confirmed: true },
  { id: "cpi-mar-26",   type: "cpi",       name: "CPI Release (Mar)",    date: "2026-04-10", importance: "high",     confirmed: false },

  // NFP
  { id: "nfp-jan-26",   type: "nfp",       name: "NFP Jobs Report (Jan)", date: "2026-02-07", importance: "high",    confirmed: true },
  { id: "nfp-feb-26",   type: "nfp",       name: "NFP Jobs Report (Feb)", date: "2026-03-07", importance: "high",    confirmed: true },

  // PPI
  { id: "ppi-jan-26",   type: "ppi",       name: "PPI Release (Jan)",    date: "2026-02-13", importance: "medium",   confirmed: true },

  // GDP
  { id: "gdp-q4-adv",   type: "gdp",       name: "Q4'25 GDP (Advance)",  date: "2026-01-30", importance: "high",     confirmed: true },
  { id: "gdp-q4-rev",   type: "gdp",       name: "Q4'25 GDP (Revised)",  date: "2026-02-27", importance: "medium",   confirmed: true },

  // OPEX (3rd Friday each month)
  { id: "opex-jan-26",  type: "opex",      name: "Monthly OPEX (Jan)",   date: "2026-01-17", importance: "medium",   confirmed: true },
  { id: "opex-feb-26",  type: "opex",      name: "Monthly OPEX (Feb)",   date: "2026-02-21", importance: "medium",   confirmed: true },
  { id: "opex-mar-26",  type: "opex",      name: "Monthly OPEX (Mar) — Quarterly Witching", date: "2026-03-21", importance: "high", confirmed: true },
  { id: "opex-apr-26",  type: "opex",      name: "Monthly OPEX (Apr)",   date: "2026-04-18", importance: "medium",   confirmed: true },

  // Turn-of-month (last trading day)
  { id: "tom-jan-26",   type: "turn_of_month", name: "Turn-of-Month (Jan→Feb)", date: "2026-01-31", importance: "low", confirmed: true },
  { id: "tom-feb-26",   type: "turn_of_month", name: "Turn-of-Month (Feb→Mar)", date: "2026-02-28", importance: "low", confirmed: true },
  { id: "tom-mar-26",   type: "turn_of_month", name: "Turn-of-Month (Mar→Apr)", date: "2026-03-31", importance: "low", confirmed: true },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

const ALL_EVENTS: CalendarEvent[] = [
  ...EARNINGS_CALENDAR,
  ...FDA_CALENDAR,
  ...MACRO_CALENDAR,
];

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

/** Events for a ticker within the next N days */
export function getUpcomingEventsForTicker(
  symbol: string,
  now: Date,
  horizonDays = 90,
): CalendarEvent[] {
  return ALL_EVENTS.filter((ev) => {
    const d = new Date(ev.date);
    const days = daysBetween(now, d);
    if (days < 0 || days > horizonDays) return false;
    // Macro events apply to everyone; stock events only if ticker matches
    if (!ev.tickers || ev.tickers.length === 0) return true;
    return ev.tickers.includes(symbol);
  }).sort((a, b) => a.date.localeCompare(b.date));
}

/** Next earnings for a ticker (null if not in calendar) */
export function getNextEarnings(symbol: string, now: Date): CalendarEvent | null {
  return (
    EARNINGS_CALENDAR.find((ev) => {
      if (!ev.tickers?.includes(symbol)) return false;
      return daysBetween(now, new Date(ev.date)) >= 0;
    }) ?? null
  );
}

/** All macro events within N days */
export function getUpcomingMacroEvents(now: Date, horizonDays = 14): CalendarEvent[] {
  return MACRO_CALENDAR.filter((ev) => {
    const days = daysBetween(now, new Date(ev.date));
    return days >= 0 && days <= horizonDays;
  }).sort((a, b) => a.date.localeCompare(b.date));
}

/** Next OPEX date */
export function getNextOpex(now: Date): CalendarEvent | null {
  return (
    MACRO_CALENDAR.filter((ev) => ev.type === "opex" && daysBetween(now, new Date(ev.date)) >= 0)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  );
}
