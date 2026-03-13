import { z } from "zod";

// Zod validators for Polygon API responses

export const PolygonOptionTradeSchema = z.object({
  conditions: z.array(z.number()).default([]),
  correction: z.number().optional(),
  exchange: z.number(),
  id: z.string(),
  participant_timestamp: z.number(),
  price: z.number().positive(),
  sequence_number: z.number(),
  sip_timestamp: z.number(),
  size: z.number().int().positive(),
  timeframe: z.string().optional(),
});

export const PolygonOptionQuoteSchema = z.object({
  ask_exchange: z.number().optional(),
  ask_price: z.number(),
  ask_size: z.number(),
  bid_exchange: z.number().optional(),
  bid_price: z.number(),
  bid_size: z.number(),
  participant_timestamp: z.number(),
  sequence_number: z.number(),
  sip_timestamp: z.number(),
  timeframe: z.string().optional(),
});

export const PolygonChainResultSchema = z.object({
  break_even_price: z.number(),
  day: z.object({
    change: z.number(),
    change_percent: z.number(),
    close: z.number(),
    high: z.number(),
    last_updated: z.number(),
    low: z.number(),
    open: z.number(),
    previous_close: z.number(),
    volume: z.number(),
    vwap: z.number(),
  }),
  details: z.object({
    contract_type: z.enum(["call", "put"]),
    exercise_style: z.enum(["american", "european"]),
    expiration_date: z.string(),
    shares_per_contract: z.number().default(100),
    strike_price: z.number(),
    ticker: z.string(),
  }),
  greeks: z.object({
    delta: z.number(),
    gamma: z.number(),
    theta: z.number(),
    vega: z.number(),
  }).optional(),
  implied_volatility: z.number().optional(),
  last_quote: z.object({
    ask: z.number(),
    ask_size: z.number(),
    bid: z.number(),
    bid_size: z.number(),
    last_updated: z.number(),
    midpoint: z.number(),
    timeframe: z.string(),
  }).optional(),
  last_trade: z.object({
    conditions: z.array(z.number()),
    price: z.number(),
    sip_timestamp: z.number(),
    size: z.number(),
    timeframe: z.string(),
  }).nullable().optional(),
  open_interest: z.number().optional(),
  underlying_asset: z.object({
    change_to_break_even: z.number(),
    last_updated: z.number(),
    price: z.number(),
    ticker: z.string(),
    timeframe: z.string(),
  }).optional(),
});

export const PolygonAggregateSchema = z.object({
  c: z.number(),
  h: z.number(),
  l: z.number(),
  n: z.number().optional(),
  o: z.number(),
  t: z.number(),
  v: z.number(),
  vw: z.number().optional(),
});

export type PolygonOptionTradeInput = z.infer<typeof PolygonOptionTradeSchema>;
export type PolygonOptionQuoteInput = z.infer<typeof PolygonOptionQuoteSchema>;
export type PolygonChainResultInput = z.infer<typeof PolygonChainResultSchema>;
export type PolygonAggregateInput = z.infer<typeof PolygonAggregateSchema>;
