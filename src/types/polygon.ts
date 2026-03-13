// Polygon.io API response types

export interface PolygonResponse<T> {
  results: T;
  status: string;
  request_id: string;
  count?: number;
  next_url?: string;
}

export interface PolygonCursor<T> {
  results: T[];
  status: string;
  request_id: string;
  next_url?: string;
}

// ─── Options Trade (REST v3/trades) ───────────────────────────────────────────

export interface PolygonOptionTrade {
  conditions: number[];
  correction: number;
  exchange: number;
  id: string;
  participant_timestamp: number; // nanoseconds
  price: number;
  sequence_number: number;
  sip_timestamp: number; // nanoseconds
  size: number;
  timeframe: string;
}

// ─── Options Quote (REST v3/quotes) ───────────────────────────────────────────

export interface PolygonOptionQuote {
  ask_exchange: number;
  ask_price: number;
  ask_size: number;
  bid_exchange: number;
  bid_price: number;
  bid_size: number;
  participant_timestamp: number;
  sequence_number: number;
  sip_timestamp: number;
  timeframe: string;
}

// ─── Options Chain Snapshot ────────────────────────────────────────────────────

export interface PolygonOptionChainResult {
  break_even_price: number;
  day: {
    change: number;
    change_percent: number;
    close: number;
    high: number;
    last_updated: number;
    low: number;
    open: number;
    previous_close: number;
    volume: number;
    vwap: number;
  };
  details: {
    contract_type: "call" | "put";
    exercise_style: "american" | "european";
    expiration_date: string; // YYYY-MM-DD
    shares_per_contract: number;
    strike_price: number;
    ticker: string;
  };
  greeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
  implied_volatility: number;
  last_quote: {
    ask: number;
    ask_size: number;
    bid: number;
    bid_size: number;
    last_updated: number;
    midpoint: number;
    timeframe: string;
  };
  last_trade: {
    conditions: number[];
    price: number;
    sip_timestamp: number;
    size: number;
    timeframe: string;
  } | null;
  open_interest: number;
  underlying_asset: {
    change_to_break_even: number;
    last_updated: number;
    price: number;
    ticker: string;
    timeframe: string;
  };
}

export interface PolygonOptionsChainResponse {
  results: PolygonOptionChainResult[];
  status: string;
  request_id: string;
  next_url?: string;
}

// ─── Stock Aggregates ──────────────────────────────────────────────────────────

export interface PolygonAggregate {
  c: number;  // close
  h: number;  // high
  l: number;  // low
  n: number;  // number of trades
  o: number;  // open
  t: number;  // timestamp ms
  v: number;  // volume
  vw: number; // vwap
}

export interface PolygonAggregatesResponse {
  ticker: string;
  results: PolygonAggregate[];
  status: string;
  request_id: string;
  resultsCount: number;
  adjusted: boolean;
  queryCount: number;
}

// ─── Stock Snapshot ───────────────────────────────────────────────────────────

export interface PolygonStockSnapshot {
  day: {
    c: number; h: number; l: number; o: number; v: number; vw: number;
  };
  lastTrade: { p: number; s: number; t: number; };
  lastQuote: { P: number; S: number; p: number; s: number; t: number; };
  min: { av: number; c: number; h: number; l: number; o: number; v: number; vw: number; };
  prevDay: { c: number; h: number; l: number; o: number; v: number; vw: number; };
  ticker: string;
  todaysChange: number;
  todaysChangePerc: number;
  updated: number;
}

// ─── WebSocket Messages ────────────────────────────────────────────────────────

export type PolygonWsEvent = "connected" | "auth_success" | "auth_failed" | "subscribed";

export interface PolygonWsMessage<T = unknown> {
  ev: string;
  sym?: string;
  [key: string]: unknown;
}

export interface PolygonWsOptionTrade {
  ev: "T";      // event type: Trade
  sym: string;  // e.g. "O:AAPL231215C00180000"
  x: number;    // exchange ID
  p: number;    // price
  s: number;    // size
  c: number[];  // conditions
  t: number;    // SIP timestamp ms
  q: number;    // sequence number
}

export interface PolygonWsOptionQuote {
  ev: "Q";      // Quote
  sym: string;
  bx: number;   // bid exchange
  ax: number;   // ask exchange
  bp: number;   // bid price
  ap: number;   // ask price
  bs: number;   // bid size
  as: number;   // ask size
  t: number;    // timestamp ms
  q: number;    // sequence
}

// ─── Option Details (contract metadata) ───────────────────────────────────────

export interface PolygonOptionDetails {
  ticker: string;
  cfi: string;
  contract_type: "call" | "put";
  exercise_style: "american" | "european";
  expiration_date: string;
  primary_exchange: string;
  shares_per_contract: number;
  strike_price: number;
  underlying_ticker: string;
}

// ─── Parsed / normalized internal types ───────────────────────────────────────

export interface ParsedOptionTicker {
  raw: string;         // O:AAPL231215C00180000
  underlying: string;  // AAPL
  expiration: Date;
  optionType: "call" | "put";
  strike: number;
  dte: number;
}
