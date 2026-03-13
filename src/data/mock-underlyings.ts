import type { UnderlyingUI } from "@/types/index";

export const MOCK_UNDERLYINGS: UnderlyingUI[] = [
  { symbol: "AAPL",  name: "Apple Inc.",            sector: "Technology",              marketCap: 3_440_000_000_000, avgVolume30d: 58_000_000, beta: 1.24, currentPrice: 228.52, dayChange: 1.34, dayChangePercent: 0.59 },
  { symbol: "NVDA",  name: "NVIDIA Corporation",     sector: "Technology",              marketCap: 2_150_000_000_000, avgVolume30d: 220_000_000, beta: 1.72, currentPrice: 875.40, dayChange: 18.6, dayChangePercent: 2.17 },
  { symbol: "TSLA",  name: "Tesla, Inc.",             sector: "Consumer Discretionary",  marketCap: 793_000_000_000,  avgVolume30d: 112_000_000, beta: 2.01, currentPrice: 248.30, dayChange: -3.2,  dayChangePercent: -1.27 },
  { symbol: "SPY",   name: "SPDR S&P 500 ETF",        sector: "ETF",                     marketCap: 560_000_000_000,  avgVolume30d: 85_000_000,  beta: 1.0,  currentPrice: 594.10, dayChange: 0.82, dayChangePercent: 0.14 },
  { symbol: "QQQ",   name: "Invesco QQQ Trust",       sector: "ETF",                     marketCap: 300_000_000_000,  avgVolume30d: 55_000_000,  beta: 1.05, currentPrice: 518.40, dayChange: 1.10, dayChangePercent: 0.21 },
  { symbol: "META",  name: "Meta Platforms, Inc.",    sector: "Technology",              marketCap: 1_480_000_000_000, avgVolume30d: 18_000_000, beta: 1.42, currentPrice: 582.00, dayChange: 5.20, dayChangePercent: 0.90 },
  { symbol: "AMD",   name: "Advanced Micro Devices",  sector: "Technology",              marketCap: 272_000_000_000,  avgVolume30d: 72_000_000,  beta: 1.85, currentPrice: 168.30, dayChange: -2.1,  dayChangePercent: -1.23 },
  { symbol: "AMZN",  name: "Amazon.com, Inc.",         sector: "Consumer Discretionary",  marketCap: 2_360_000_000_000, avgVolume30d: 45_000_000, beta: 1.38, currentPrice: 223.40, dayChange: 2.30, dayChangePercent: 1.04 },
  { symbol: "MRNA",  name: "Moderna, Inc.",            sector: "Healthcare",              marketCap: 14_500_000_000,   avgVolume30d: 12_000_000,  beta: 0.52, currentPrice: 38.20,  dayChange: -0.8,  dayChangePercent: -2.05 },
  { symbol: "XBI",   name: "SPDR S&P Biotech ETF",    sector: "Healthcare",              marketCap: 8_200_000_000,    avgVolume30d: 9_500_000,   beta: 0.88, currentPrice: 91.30,  dayChange: -1.1,  dayChangePercent: -1.19 },
];

export const MOCK_THEMES = [
  { id: "theme_ai",      name: "AI Infrastructure",    slug: "ai-infra",      emoji: "🤖", color: "#06b6d4", memberCount: 12, totalPremiumToday: 18_400_000, signalCount: 14, dominantDirection: "bullish" as const },
  { id: "theme_glp1",    name: "GLP-1 / Obesity",      slug: "glp1",          emoji: "💊", color: "#a855f7", memberCount: 8,  totalPremiumToday: 6_200_000,  signalCount: 7,  dominantDirection: "mixed" as const },
  { id: "theme_ev",      name: "EV + Clean Energy",     slug: "ev-energy",     emoji: "⚡", color: "#22c55e", memberCount: 10, totalPremiumToday: 4_100_000,  signalCount: 5,  dominantDirection: "bullish" as const },
  { id: "theme_bio",     name: "Biotech / Genomics",    slug: "biotech",       emoji: "🧬", color: "#f59e0b", memberCount: 15, totalPremiumToday: 8_900_000,  signalCount: 9,  dominantDirection: "bearish" as const },
  { id: "theme_macro",   name: "Macro / Rates",         slug: "macro-rates",   emoji: "🏦", color: "#ef4444", memberCount: 5,  totalPremiumToday: 11_200_000, signalCount: 11, dominantDirection: "neutral" as const },
  { id: "theme_defense", name: "Defense & Cyber",       slug: "defense-cyber", emoji: "🛡️", color: "#7c3aed", memberCount: 9,  totalPremiumToday: 3_600_000,  signalCount: 4,  dominantDirection: "bullish" as const },
];
