# Unusual Flow Radar

> Real-time equity options unusual-flow detection, scoring, and feed publishing.

A Next.js application that ingests live options trade data from Polygon.io, detects statistically unusual buying patterns (sweeps, blocks, combos, and repeat activity), scores them across 11 independent dimensions, and publishes a Twitter-style enriched signal feed.

---

## Quick Start (Mock Mode — no API keys needed)

```bash
# 1. Install dependencies
cd unusual-flow-radar
npm install

# 2. Copy env file
cp .env.example .env.local
# MOCK_MODE=true and NEXT_PUBLIC_MOCK_MODE=true are already set

# 3. Start the dev server
npm run dev -- --port 3001

# 4. Open http://localhost:3001
```

No database, Redis, or Polygon API key is required in mock mode.

---

## Full Setup (Live Mode)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (local or hosted — Neon recommended for serverless)
- Redis 7+ (local or Upstash for serverless)
- Polygon.io API key (Advanced plan for real-time WebSocket)

### Steps

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — fill in POLYGON_API_KEY, DATABASE_URL, REDIS_URL

# 3. Set up the database
npx prisma db push

# 4. Start dev server
npm run dev -- --port 3001
```

Set `MOCK_MODE=false` and `NEXT_PUBLIC_MOCK_MODE=false` in `.env.local` to connect to live data.

---

## Architecture Overview

```
Polygon WS / REST ──► Trade Ingestion Worker ──► Flow Detector (16 detectors)
                                                          │
                                              Signal Aggregator + Combo Detector
                                                          │
                                               Quality Control Layer (QC)
                                                          │
                                             Composite Scorer (11 dimensions)
                                                          │
                                        Feed Publisher ──► PostgreSQL + Redis cache
                                                          │
                                                  Next.js App ──► Browser
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full technical reference.

---

## Pages

| Path | Description |
|------|-------------|
| `/dashboard` | Stats bar, intraday chart, filterable signal grid |
| `/feed` | Twitter-style enriched signal posts with drawer detail |
| `/feed/[symbol]` | Symbol-specific signal history |
| `/themes` | 6 theme cards (AI Infra, GLP-1, EV, Biotech, Macro, Defense) |
| `/quality` | Signal quality dashboard — QC stats, suppression breakdown |
| `/backtest-lite` | Scenario replay tool with 7 archetypal test fixtures |
| `/settings` | All detection thresholds and QC parameters |
| `/api/health` | System health endpoint (market session, errors, cache) |

---

## Scoring Engine

Signals are scored on 11 independent dimensions (0–100 each), combined with configurable weights:

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| `volOi` | 0.14 | Volume ÷ Open Interest ratio |
| `notional` | 0.12 | Total premium paid |
| `eventProximity` | 0.14 | Days to nearest earnings / FDA / macro event |
| `directionality` | 0.10 | Aggressor-side conviction |
| `peerSync` | 0.08 | Same-direction flow across peer group |
| `combo` | 0.08 | Multi-leg structure recognition |
| `ivAbnormality` | 0.08 | IV vs. historical mean |
| `novelty` | 0.08 | Signal against ticker's historical baseline |
| `oiVelocity` | 0.07 | Rate of OI change |
| `themeSync` | 0.06 | Cross-sector theme synchronization |
| `timeOfDay` | 0.05 | Market session urgency weight |

Signals below `minPublishScore` (default: 55) are suppressed before reaching the feed.

---

## Quality Control Layer

Applied after detection, before publication:

| Check | Type | Action |
|-------|------|--------|
| Expired contract (DTE < 0) | Hard | Suppress |
| Tiny lot (< 50 cts) | Hard | Suppress |
| Micro premium (< $10K) | Hard | Suppress |
| Broken quote (neg IV, implausible price) | Hard | Suppress |
| Stale duplicate (same contract, same direction, within window) | Hard | Suppress |
| Small lot (< 100 cts) | Soft | −penalty pts |
| Low premium (< $50K) | Soft | −penalty pts |
| Weak direction confidence (< 40%) | Soft | −penalty pts |
| Off-hours, low score | Conditional | Suppress if score < threshold |

Maximum score penalty from soft checks: −30 points.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Cache / State | Redis (ioredis) |
| Job Queue | BullMQ |
| UI | Tailwind CSS, Recharts |
| Validation | Zod |
| Client State | Zustand (persisted to localStorage) |
| Data Source | Polygon.io REST + WebSocket |

---

## Project Structure

```
src/
  app/                  # Next.js pages (App Router)
    api/                # API routes (/signals, /backtest, /health, etc.)
    dashboard/          # Dashboard page
    feed/               # Flow feed + symbol history
    quality/            # Signal quality dashboard
    backtest-lite/      # Scenario replay + fixtures browser
    settings/           # All threshold controls
    themes/             # Theme overview
  components/
    layout/             # Sidebar, topbar, ticker-tape
    feed/               # FeedCard, SignalDrawer, TagList, etc.
    dashboard/          # StatsBar, SignalGrid, IntradayChart
  lib/
    detection/          # Flow detector (16 detectors), combo, QC layer, config
    scoring/            # Composite scorer + 11 dimension functions
    polygon/            # WebSocket client + mock data generator
    api/                # Resilience layer (retry, cache, batching, fallback)
    workers/            # BullMQ queue definitions
    market-hours.ts     # Market session + NYSE holiday calendar
    logger.ts           # Structured logger with ring buffer + error hooks
  data/
    mock-signals.ts     # 10 representative mock signals
    mock-underlyings.ts # 6 themes + 10 underlying data points
    test-fixtures.ts    # 7 archetypal scenario fixtures for QA + backtest
  types/
    signals.ts          # EnrichedSignal, DetectedSignalPayload, scoring types
    index.ts            # AppSettings, SignalFilters, UI types
prisma/
  schema.prisma         # 17-model Prisma schema
```

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/signals` | GET | Paginated signal list with filters |
| `/api/signals/[id]` | GET | Single signal detail |
| `/api/backtest/simulate` | POST | Run backtest simulation |
| `/api/health` | GET | System health (status, market session, errors, cache) |

---

## Development

```bash
# Run dev server
npm run dev -- --port 3001

# Type check
npm run type-check    # or: npx tsc --noEmit

# Lint
npm run lint

# Run unit tests (scoring engine + QC layer)
npm test
```

---

## Deployment

1. Provision PostgreSQL and Redis (Neon + Upstash recommended for serverless).
2. Set all environment variables in your host's dashboard (Vercel, Railway, etc.).
3. Run `npx prisma db push` to apply the schema.
4. Deploy the Next.js app. BullMQ workers must run as long-lived Node.js processes (not Edge Runtime).

---

## License

Private — not for redistribution.
