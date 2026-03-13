# Unusual Flow Radar — Architecture

> Real-time equity options unusual-flow detection, scoring, and feed publishing.
> Tech: Next.js 15 · TypeScript · PostgreSQL/Prisma · Redis · BullMQ · Recharts

---

## Table of Contents
1. [Overview](#overview)
2. [Folder Structure](#folder-structure)
3. [Data Flow](#data-flow)
4. [Scoring Engine](#scoring-engine)
5. [Signal Detectors (A–P + Extended)](#signal-detectors)
6. [Database Schema](#database-schema)
7. [Queue Architecture](#queue-architecture)
8. [Environment Variables](#environment-variables)
9. [Mock Mode](#mock-mode)
10. [Pages](#pages)

---

## Overview

```
Polygon WS / REST ──► Trade Ingestion Worker ──► Detection Engine ──► Signal Aggregator
                                                                            │
                                                                ┌───────────▼────────────┐
                                                                │  Signal Processor Worker│
                                                                │  (persist to Postgres)  │
                                                                └───────────┬────────────┘
                                                                            │
                                                                ┌───────────▼────────────┐
                                                                │  Feed Publisher Worker  │
                                                                │  (format + store post)  │
                                                                └───────────┬────────────┘
                                                                            │
                                                              Next.js API Routes ──► UI
```

---

## Folder Structure

```
unusual-flow-radar/
├── prisma/
│   └── schema.prisma              # All 17+ Prisma models
│
├── src/
│   ├── app/                       # Next.js App Router pages + API routes
│   │   ├── dashboard/page.tsx
│   │   ├── feed/page.tsx
│   │   ├── ticker/[symbol]/page.tsx
│   │   ├── themes/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── backtest-lite/page.tsx
│   │   └── api/
│   │       ├── signals/route.ts
│   │       ├── polygon/chain/route.ts
│   │       └── backtest/simulate/route.ts
│   │
│   ├── lib/
│   │   ├── polygon/
│   │   │   ├── client.ts          # Base fetch with retry + pagination
│   │   │   ├── mock.ts            # Mock data generator (MOCK_MODE)
│   │   │   ├── rest/
│   │   │   │   ├── options-trades.ts
│   │   │   │   ├── options-chain.ts
│   │   │   │   ├── stock-data.ts
│   │   │   │   └── contracts.ts
│   │   │   └── ws/
│   │   │       └── websocket.ts   # Auto-reconnecting WS client
│   │   │
│   │   ├── detection/
│   │   │   ├── config.ts          # All detection thresholds in one place
│   │   │   ├── flow-detector.ts   # Main ingest + all 16+ detectors
│   │   │   ├── combo-detector.ts  # Multi-leg structure identification
│   │   │   └── signal-aggregator.ts # Dedup + merge + dispatch
│   │   │
│   │   ├── scoring/
│   │   │   ├── dimensions.ts      # 11 pure scoring functions (0-100 each)
│   │   │   └── scorer.ts          # Weighted composite score + direction
│   │   │
│   │   ├── enrichment/
│   │   │   ├── feed-formatter.ts  # Human-readable post generation
│   │   │   └── event-enricher.ts  # Earnings / FDA / Macro calendar lookup
│   │   │
│   │   ├── workers/
│   │   │   ├── queue.ts           # BullMQ queue definitions + job types
│   │   │   └── signal-processor.worker.ts
│   │   │
│   │   ├── redis/
│   │   │   ├── client.ts
│   │   │   └── intraday.ts        # Rolling z-score baselines + vol state
│   │   │
│   │   ├── db/
│   │   │   └── prisma.ts          # Singleton Prisma client
│   │   │
│   │   ├── utils/
│   │   │   ├── options-math.ts    # Ticker parse, DTE, z-score, MAD, clamp
│   │   │   └── formatting.ts
│   │   │
│   │   └── __tests__/
│   │       └── scoring.test.ts    # Jest unit tests
│   │
│   ├── types/
│   │   ├── polygon.ts             # Polygon API response shapes
│   │   ├── signals.ts             # DetectedSignalPayload, ScoreResult, etc.
│   │   └── index.ts               # UI types (EnrichedSignal, FeedPostUI, etc.)
│   │
│   ├── schemas/
│   │   ├── polygon.ts             # Zod schemas for Polygon payloads
│   │   └── signals.ts             # Zod schemas for signal API
│   │
│   ├── data/
│   │   ├── mock-signals.ts        # 10 pre-built EnrichedSignal objects
│   │   └── mock-underlyings.ts    # 10 underlyings + 6 themes
│   │
│   ├── store/
│   │   └── app-store.ts           # Zustand (persisted to localStorage)
│   │
│   ├── hooks/
│   │   └── use-signals.ts
│   │
│   └── components/
│       ├── layout/
│       │   ├── sidebar.tsx
│       │   ├── topbar.tsx
│       │   └── app-shell.tsx
│       ├── dashboard/
│       │   ├── signal-card.tsx
│       │   ├── filter-bar.tsx
│       │   └── stats-bar.tsx
│       ├── feed/
│       │   └── post-card.tsx
│       └── charts/
│           └── flow-chart.tsx
```

---

## Data Flow

### Intraday (live)
```
Polygon WS (ev:"T" option trades)
  → PolygonOptionsWS.onTrade()
  → TradeIngestionQueue.add("ingest-trade", rawTrade)
  → TradeIngestionWorker
      └─ parseOptionTicker()
      └─ DTE gate (≤90d)
      └─ Premium gate (≥$50K)
      └─ FlowDetector.ingestTrade(trade, ctx)
            ├─ ContractBuffer (rolling window)
            ├─ computeScore(ScorerInput) → ScoreResult
            ├─ Score gate (≥45 publish threshold)
            └─ SignalAggregator.submitSignal(payload)
                  ├─ Dedup (5-min key window)
                  └─ Dispatch → SignalProcessorQueue
                                  └─ Persist to DB (Prisma)
                                  └─ FeedPublisherQueue (if score ≥ 65)
                                        └─ formatSignalPost() → FeedPost
```

### REST polling (fallback / chain enrichment)
```
Polygon REST /v3/snapshot/options/{symbol}
  → fetchOptionsChain()
  → Upsert OptionSnapshot + OIHistory
  → Feed into scoring baselines
```

---

## Scoring Engine

### Dimensions (each 0–100)

| # | Dimension | Weight | Notes |
|---|-----------|--------|-------|
| A+B | `volOi` | 0.14 | Vol/OI ratio tiers + robust z-score vs history |
| C | `notional` | 0.12 | $50K→20, $250K→50, $1M→75, $5M→100 |
| D | `timeOfDay` | 0.05 | Mid-session quiet periods get +15 base |
| G | `ivAbnormality` | 0.08 | IV rank (high >70 or low <20) + IV/RV ratio |
| E | `oiVelocity` | 0.07 | OI% change + absolute change vs MAD baseline |
| H/I/J | `eventProximity` | 0.14 | Earnings (1.0×), FDA (0.9×), Macro (0.7×) |
| F | `peerSync` | 0.08 | Unusual peer count / total peers, bonus ≥3 |
| K | `directionality` | 0.10 | Aggressor side + price vs mid + moneyness |
| L | `combo` | 0.08 | Multi-leg structure bonus (straddle=+25, etc.) |
| N | `themeSync` | 0.06 | Theme coverage × quality blend |
| M | `novelty` | 0.08 | 60–100 when no known catalyst |

**Composite formula:**
```
totalScore = clamp(round(Σ dim_i × weight_i))   // 0–100

confidence = highDims / activeDims
           + 0.10 if volOi ≥ 70
           + 0.10 if notional ≥ 70
           + 0.05 if eventProximity ≥ 60
           + 0.05 if directionality ≥ 65
```

### Statistical methods
- **Robust z-score**: `(x − median) / (1.4826 × MAD)` — outlier-resistant
- **Standard z-score**: `(x − mean) / stdev`
- **Percentile rank**: position in sorted array
- **Sigmoid normalization**: `clamp(z / maxZ × 100, 0, 100)`

---

## Signal Detectors

| ID | Name | Trigger |
|----|------|---------|
| A | Historical vol spike | Vol z-score ≥ 2.5 vs contract baseline |
| B | Vol vs OI | Vol/OI ratio ≥ 0.5 (noteworthy) → 1.0 (unusual) → 2.5 (extreme) |
| C | Absolute size | Contracts ≥ 100 AND premium ≥ $50K |
| D | Time-of-day | Mid-session bucket z-score vs historical same-bucket |
| E | OI velocity | OI change ≥ 20% or ≥ 500 contracts in one session |
| F | Peer sync | ≥ 2 peers showing unusual flow simultaneously |
| G | IV abnormality | IV rank ≥ 70 (expensive vol) or ≤ 20 (cheap vol) |
| H | Pre-earnings | Option expires within 2× earnings window, earnings ≤ DTE |
| I | Pre-FDA | Same logic for FDA/PDUFA catalyst dates |
| J | Macro proximity | Same logic for Fed/CPI/NFP events (weight 0.7×) |
| K | Directional bet | Aggressor buy + above mid + OTM = high conviction direction |
| L | Combo trade | Legs linked by time+expiry+underlying within 2s window |
| M | Novelty | No known catalyst — pure dark-pool / informed flow |
| N | Theme sync | ≥ 2 same-theme names flowing in rolling 30-min window |
| O | Sector rotation | Broad sector ETF vs sector names divergence |
| P | Factor rotation | Factor ETF flow vs underlying correlation |

**Extended detectors:**
- Sweep imbalance (call vs put sweep ratio)
- Repeat accumulation (same strike ≥ 3× in same session)
- Cross-strike laddering (sequential OTM strikes same direction)
- Expiry concentration (≥ 60% premium in single expiry)
- Vol intent (IV delta on trade — buying vs selling vol)
- Flow opposing spot (bearish options while stock rallying)
- Trade origin heuristic (institutional vs retail size proxy)

---

## Database Schema

Key models (see `prisma/schema.prisma` for full detail):

```
Underlying          ── name, sector, peerGroupId, themes[]
OptionContract      ── ticker, underlying, strike, expiry, type, initialDte
OptionTrade         ── contractId, side, qty, price, premium, IV, delta, tradeTime
OptionSnapshot      ── contractId, dayVol, OI, IV, greeks, underlyingPrice
OIHistory           ── contractId, date, openInterest
EarningsEvent       ── symbol, reportDate, confirmed
MacroEvent          ── name, eventDate, type (FED/CPI/NFP/OTHER), importance
FdaCatalyst         ── symbol, pdufa/adcom dates, drug, indication
DetectedSignal      ── 11 score columns, direction, signalType, totalPremium
SignalLeg           ── linked to DetectedSignal + OptionContract
FeedPost            ── headline, body, tags, signalId
PeerGroup           ── name, members[]
ThemeBucket         ── name, description, members[]
```

---

## Queue Architecture

Three BullMQ queues on Redis:

```
trade-ingestion    → raw Polygon trade → parse → detect → submit
signal-processor   → persist signal + legs to DB → queue feed post
feed-publisher     → format FeedPost → store → (future: push to WS clients)
```

Worker concurrency controlled by env vars:
- `TRADE_INGESTION_CONCURRENCY` (default: 4)
- `SIGNAL_PROCESSOR_CONCURRENCY` (default: 2)

---

## Environment Variables

```bash
# Polygon
POLYGON_API_KEY=your_key
POLYGON_WS_URL=wss://socket.polygon.io/options

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ufr

# Redis
REDIS_URL=redis://localhost:6379
REDIS_QUEUE_URL=redis://localhost:6379   # separate instance recommended

# Mock mode (no Polygon key needed)
NEXT_PUBLIC_MOCK_MODE=true
MOCK_MODE=true

# Thresholds (override defaults)
MIN_SIGNAL_NOTIONAL=50000
MIN_SIGNAL_CONTRACTS=100
MAX_DTE=90
MIN_PUBLISH_SCORE=65
```

---

## Mock Mode

Set `MOCK_MODE=true` (or omit `POLYGON_API_KEY`) to run fully offline:

- API routes return `MOCK_SIGNALS` (10 pre-built signals)
- `/api/polygon/chain` returns generated mock chain
- `/api/backtest/simulate` uses `runSimulation()` with synthetic trades
- Topbar shows **MOCK** badge
- All UI features functional — scores, filters, feed posts, themes

---

## Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | `DashboardPage` | Stats bar, intraday chart, signal grid with filters |
| `/feed` | `FeedPage` | Twitter-like enriched signal posts |
| `/ticker/[symbol]` | `TickerPage` | Options chain table (11 strikes), signal sidebar |
| `/themes` | `ThemesPage` | 6 theme cards with premium bars |
| `/settings` | `SettingsPage` | Toggle rows for all AppSettings + watchlist |
| `/backtest-lite` | `BacktestPage` | Simulator controls → POST `/api/backtest/simulate` |

---

## Running

```bash
# Development (mock mode, no DB needed)
cp .env.example .env.local
# Set MOCK_MODE=true, NEXT_PUBLIC_MOCK_MODE=true
npm run dev

# With real DB
npx prisma generate
npx prisma db push
npm run dev

# Workers (separate processes)
npm run worker:signal   # signal-processor.worker.ts
npm run worker:trade    # trade-ingestion.worker.ts (to be added)

# Tests
npx jest src/lib/__tests__/scoring.test.ts
```
