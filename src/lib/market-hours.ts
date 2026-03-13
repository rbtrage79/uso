/**
 * Market Hours Awareness
 *
 * Centralises all time-of-day logic for US equities/options markets.
 * All times are US Eastern (accounts for DST automatically via Intl).
 */

export type MarketSession =
  | "pre_market"    // 4:00 – 9:29 ET
  | "market_open"   // 9:30 – 10:00 ET  (first 30 min, high vol)
  | "mid_session"   // 10:01 – 15:29 ET
  | "market_close"  // 15:30 – 16:00 ET (last 30 min, high vol)
  | "after_hours"   // 16:01 – 20:00 ET
  | "closed";       // 20:01 – 3:59 ET + weekends + holidays

export interface MarketTimeContext {
  session: MarketSession;
  /** Minutes since market open (9:30 ET). Negative = pre-market. */
  minutesSinceOpen: number;
  /** Minutes until market close (16:00 ET). Negative = after-hours. */
  minutesUntilClose: number;
  /** Whether real-time options trade data is available */
  isLive: boolean;
  /** Whether this is a low-liquidity period (pre/after/closed) */
  isOffHours: boolean;
  /** Human-readable label */
  label: string;
  /** ET time string "HH:MM" */
  etTime: string;
  /** Whether today is a trading day */
  isTradingDay: boolean;
}

// ─── NYSE Holidays 2025-2026 ──────────────────────────────────────────────────
// Dates in "YYYY-MM-DD" format (ET)
const NYSE_HOLIDAYS = new Set([
  "2025-01-01", "2025-01-20", "2025-02-17", "2025-04-18",
  "2025-05-26", "2025-06-19", "2025-07-04", "2025-09-01",
  "2025-11-27", "2025-12-25",
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03",
  "2026-05-25", "2026-06-19", "2026-07-03", "2026-09-07",
  "2026-11-26", "2026-12-25",
]);

/** Get current ET hour/minute/dayOfWeek from any UTC timestamp */
function toET(utc: Date): { hour: number; minute: number; dayOfWeek: number; dateStr: string } {
  const etParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  }).formatToParts(utc);

  const get = (type: string) => etParts.find((p) => p.type === type)?.value ?? "0";
  const hour   = parseInt(get("hour"));
  const minute = parseInt(get("minute"));
  const day    = get("weekday"); // "Mon", "Tue", ...
  const year   = get("year");
  const month  = get("month");
  const dayNum = get("day");

  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  return {
    hour,
    minute,
    dayOfWeek: dayMap[day] ?? 1,
    dateStr: `${year}-${month}-${dayNum}`,
  };
}

export function getMarketTimeContext(now: Date = new Date()): MarketTimeContext {
  const { hour, minute, dayOfWeek, dateStr } = toET(now);

  const isWeekend  = dayOfWeek === 0 || dayOfWeek === 6;
  const isHoliday  = NYSE_HOLIDAYS.has(dateStr);
  const isTradingDay = !isWeekend && !isHoliday;

  const totalMinutes = hour * 60 + minute; // minutes since midnight ET
  const OPEN  = 9 * 60 + 30;   // 570
  const CLOSE = 16 * 60;        // 960
  const PRE   = 4 * 60;         // 240
  const AH    = 20 * 60;        // 1200

  const minutesSinceOpen  = totalMinutes - OPEN;
  const minutesUntilClose = CLOSE - totalMinutes;

  const etTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  let session: MarketSession;
  let isLive = false;

  if (!isTradingDay) {
    session = "closed";
  } else if (totalMinutes < PRE) {
    session = "closed";
  } else if (totalMinutes < OPEN) {
    session = "pre_market";
  } else if (totalMinutes <= OPEN + 30) {
    session = "market_open";
    isLive = true;
  } else if (totalMinutes < CLOSE - 30) {
    session = "mid_session";
    isLive = true;
  } else if (totalMinutes <= CLOSE) {
    session = "market_close";
    isLive = true;
  } else if (totalMinutes <= AH) {
    session = "after_hours";
  } else {
    session = "closed";
  }

  const SESSION_LABELS: Record<MarketSession, string> = {
    pre_market:    "Pre-Market",
    market_open:   "Market Open",
    mid_session:   "Mid-Session",
    market_close:  "Market Close",
    after_hours:   "After Hours",
    closed:        "Closed",
  };

  return {
    session,
    minutesSinceOpen,
    minutesUntilClose,
    isLive,
    isOffHours: !isLive,
    label: SESSION_LABELS[session],
    etTime,
    isTradingDay,
  };
}

/** Returns a 0-1 urgency weight for the current market session (used in scoring) */
export function sessionUrgencyWeight(session: MarketSession): number {
  switch (session) {
    case "market_open":  return 1.2;  // boosted — first 30 min most informative
    case "market_close": return 1.1;  // boosted — closing auction info
    case "mid_session":  return 1.0;  // baseline
    case "pre_market":   return 0.8;  // valid but lower liquidity
    case "after_hours":  return 0.6;  // lower confidence
    case "closed":       return 0.4;  // stale, likely next-day prints
    default:             return 1.0;
  }
}

/** Returns an off-hours context note for signals detected outside market hours */
export function getOffHoursNote(session: MarketSession): string | null {
  switch (session) {
    case "pre_market":  return "Detected in pre-market (4:00–9:29 ET) — lower liquidity, spreads wider";
    case "after_hours": return "Detected after hours (16:01–20:00 ET) — reduced liquidity";
    case "closed":      return "Detected outside trading hours — verify at market open";
    default:            return null;
  }
}

/** True if the given ISO timestamp was during regular market hours */
export function wasMarketHours(isoTimestamp: string): boolean {
  const ctx = getMarketTimeContext(new Date(isoTimestamp));
  return ctx.isLive;
}

/** Format a countdown to next market open */
export function nextMarketOpenLabel(now: Date = new Date()): string {
  const { isTradingDay, minutesSinceOpen } = getMarketTimeContext(now);
  if (isTradingDay && minutesSinceOpen >= 0 && minutesSinceOpen < 390) {
    return "Open now";
  }
  // Rough next-open estimate (not accounting for holidays)
  const { dayOfWeek } = toET(now);
  const daysUntil = dayOfWeek === 5 ? 3 : dayOfWeek === 6 ? 2 : 1;
  return `Opens in ~${daysUntil}d`;
}
