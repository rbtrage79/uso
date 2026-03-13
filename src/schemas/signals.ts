import { z } from "zod";

export const SignalFiltersSchema = z.object({
  direction: z.enum(["bullish", "bearish", "neutral", "mixed", "all"]).optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  minPremium: z.coerce.number().min(0).optional(),
  signalType: z
    .enum([
      "single_leg",
      "sweep",
      "block",
      "repeat_sweep",
      "combo_spread",
      "combo_straddle",
      "combo_risk_reversal",
      "combo_other",
      "all",
    ])
    .optional(),
  symbols: z.array(z.string().toUpperCase()).optional(),
  maxDte: z.coerce.number().int().min(0).max(365).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const BacktestQuerySchema = z.object({
  symbol: z.string().toUpperCase(),
  from: z.coerce.date(),
  to: z.coerce.date(),
  minScore: z.coerce.number().min(0).max(100).default(55),
  direction: z.enum(["bullish", "bearish", "all"]).default("all"),
  lookForwardDays: z.coerce.number().int().min(1).max(30).default(5),
});

export type SignalFiltersInput = z.infer<typeof SignalFiltersSchema>;
export type BacktestQueryInput = z.infer<typeof BacktestQuerySchema>;
