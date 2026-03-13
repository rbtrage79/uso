/**
 * Mock EOD recap data for March 13, 2026.
 * Pre-written static seed content — no generation required.
 */

import type { DayRecap } from "@/types/features";

export const MOCK_RECAP: DayRecap = {
  date: "March 13, 2026",
  dateISO: "2026-03-13",
  topSignalId: "sig_001",

  // ── 7 Stat Cards ────────────────────────────────────────────────────────────
  stats: [
    {
      label: "Signals Today",
      value: "47",
      sub: "vs 38 yesterday",
      trend: "up",
      color: "text-signal-cyan",
    },
    {
      label: "Total Premium",
      value: "$38.2M",
      sub: "Flow in unusual options",
      trend: "up",
      color: "text-bull",
    },
    {
      label: "Bullish",
      value: "28",
      sub: "59.6% of flow",
      trend: "up",
      color: "text-bull",
    },
    {
      label: "Bearish",
      value: "14",
      sub: "29.8% of flow",
      trend: "down",
      color: "text-bear",
    },
    {
      label: "Neutral",
      value: "5",
      sub: "Straddles & vol bids",
      trend: "flat",
      color: "text-amber-400",
    },
    {
      label: "Top Score",
      value: "91",
      sub: "NVDA — Smart Money",
      trend: "up",
      color: "text-signal-gold",
    },
    {
      label: "Avg Score",
      value: "71",
      sub: "Above 30-day avg of 67",
      trend: "up",
      color: "text-zinc-300",
    },
  ],

  // ── Tweet Thread (6 posts from @UnusualFlowRadar) ─────────────────────────
  tweetThread: [
    {
      index: 1,
      body: "🧵 Here's today's unusual options recap for March 13, 2026.\n\n47 signals. $38.2M in total premium. Bull/Bear ratio: 2:1.\n\nBig conviction names: $NVDA $BNTX $MRNA\n\nLet's break it all down 👇\n\n#UnusualFlow #Options #OptionsFlow",
      likes: 1842,
      reposts: 384,
      timestamp: "4:01 PM · Mar 13, 2026",
    },
    {
      index: 2,
      body: "1/ The day's biggest print came from $NVDA.\n\n$3.24M bullish sweep on $900 calls (35 DTE), scored 91/100.\n\nThis is pre-earnings positioning — earnings in ~32 days. Someone is betting on a major upside move into the print.\n\nConfidence: 88% 🟢",
      likes: 2310,
      reposts: 612,
      timestamp: "4:02 PM · Mar 13, 2026",
    },
    {
      index: 3,
      body: "2/ Biotech heating up hard today.\n\n$BNTX $MRNA $CRSP all saw unusual call buying ahead of FDA windows.\n\nCombined: $4.2M in bullish biotech premium across 3 names.\n\nIV is elevated — market is pricing in a binary move. 🧬\n\n#Biotech #FDA",
      likes: 1124,
      reposts: 298,
      timestamp: "4:03 PM · Mar 13, 2026",
    },
    {
      index: 4,
      body: "3/ On the bearish side, $BIIB saw a $2.34M institutional put block. No known catalyst.\n\nThis is quiet accumulation of protection — likely a portfolio hedge rather than speculative short.\n\n$GS also saw $1.46M in put buying 🔴\n\n#HedgeWave",
      likes: 876,
      reposts: 201,
      timestamp: "4:04 PM · Mar 13, 2026",
    },
    {
      index: 5,
      body: "4/ Vol bids were interesting today.\n\n$SPY $QQQ $IWM all saw straddle activity ahead of next week's macro events.\n\nSomeone is paying up for a big move in either direction.\n\nFOMC minutes + CPI both due within 10 days. 🏦\n\n#VolatilityBid #Macro",
      likes: 1453,
      reposts: 342,
      timestamp: "4:05 PM · Mar 13, 2026",
    },
    {
      index: 6,
      body: "5/ Tomorrow's theme to watch: GLP-1 rotation.\n\n$LLY $NVO seeing coordinated bullish flow — theme sync score elevated.\n\nWith $NVO's weight loss drug quarterly data due, this basket could move big.\n\nFull recap + 5 things to watch below 👇\n\n#GLP1 #Options",
      likes: 2088,
      reposts: 489,
      timestamp: "4:06 PM · Mar 13, 2026",
    },
  ],

  // ── 5 Things to Watch Tomorrow ─────────────────────────────────────────────
  fiveThings: [
    {
      rank: 1,
      title: "NVDA Earnings Positioning Window",
      symbols: ["NVDA", "AMD", "PLTR"],
      description:
        "AI semis saw $3.2M+ in bullish sweeps today. With NVDA earnings ~32 days out, the window for pre-earnings call buying is now open. Watch for follow-through accumulation in AMD and PLTR.",
      catalyst: "earnings",
      label: "Smart Money? High Confidence",
      emoji: "🤖",
    },
    {
      rank: 2,
      title: "Biotech Binary Events: BNTX, MRNA, CRSP",
      symbols: ["BNTX", "MRNA", "CRSP"],
      description:
        "Three FDA catalyst windows are converging in the next 30-45 days. IV is already elevated. Expect gamma exposure to compress vol sellers and amplify any positive data surprise.",
      catalyst: "fda",
      label: "Event Chase",
      emoji: "🧬",
    },
    {
      rank: 3,
      title: "Macro Vol Bid Ahead of FOMC",
      symbols: ["SPY", "QQQ", "IWM"],
      description:
        "Index straddle buying is pricing in a larger-than-expected move from next week's FOMC minutes and CPI print. If realized vol exceeds IV, these straddle buyers win regardless of direction.",
      catalyst: "macro",
      label: "Volatility Bid",
      emoji: "🏦",
    },
    {
      rank: 4,
      title: "GLP-1 Theme Rotation: LLY & NVO",
      symbols: ["LLY", "NVO"],
      description:
        "Coordinated bullish call buying across the GLP-1 basket. Both LLY and NVO have pending data catalysts. Theme sync score is elevated — this looks like basket-level institutional positioning.",
      catalyst: "earnings",
      label: "Theme Synchronization",
      emoji: "💊",
    },
    {
      rank: 5,
      title: "Financial Sector Hedging: GS, BIIB Puts",
      symbols: ["GS", "BIIB"],
      description:
        "Large put blocks with no public catalyst suggest portfolio hedging activity. GS saw $1.46M and BIIB $2.34M. This is defensive flow — watch for sector weakness if these hedges are directional.",
      catalyst: "technical",
      label: "Hedge Wave",
      emoji: "🛡️",
    },
  ],
};
