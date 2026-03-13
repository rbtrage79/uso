# Unusual Flow Radar — Product Specification

**Version:** 1.0
**Status:** MVP — Mock-complete, live integration pending
**Last updated:** 2026-03-13

---

## 1. Problem Statement

Retail traders and small funds lack tooling to efficiently surface institutional-grade options flow in real time. Existing platforms (Unusual Whales, Blackbox Stocks) are expensive and opaque — users see alerts but cannot understand *why* a signal fired or how confident the system is. This product provides:

- Real-time detection of statistically unusual options activity
- Transparent multi-dimensional scoring (users can see which dimensions drove the score)
- Structured context (nearby earnings/FDA/macro events, peer group activity, theme sync)
- A quality-control layer that suppresses noise before it reaches the feed

---

## 2. Core User Journey

1. User opens the **Dashboard** — sees a stats bar (premium today, bull/bear ratio, top symbol) and a signal grid with the last N unusual-flow events, filterable by direction, score, premium, and DTE.
2. User clicks a signal card to open the **Signal Drawer** — shows the full score breakdown with per-dimension bars, event context, leg structure, and tags.
3. User navigates to the **Flow Feed** — a Twitter-style feed of enriched signal posts, each with emoji headline, narrative body, key tags, and a shareable URL.
4. User opens a **Ticker** — sees the options chain with unusual activity highlights, IV / OI history charts, and recent signals for that symbol.
5. User reviews the **Quality Dashboard** — monitors QC suppression counts, confidence distribution, and top tickers by premium activity.
6. Advanced user opens **Backtest Lite** — replays the 7 test fixtures or runs a random-trade simulation to validate the scoring and QC pipeline.

---

## 3. Detection Engine

### 3.1 Flow Detector

The core detector runs 16 pattern-recognition checks on each incoming options trade (or batch of trades for sweep detection):

| Detector | What it fires on |
|----------|-----------------|
| `large_single_block` | One print ≥ $250K notional |
| `sweep` | 3+ fills across multiple exchanges within 500ms |
| `repeat_sweep` | Same symbol same direction, 2nd time in session |
| `unusual_vol_oi` | Vol/OI ratio > 1.0 |
| `high_iv_call` / `high_iv_put` | IV > 1.5× 30-day mean |
| `tight_dte_event` | Option expiring within 5 days of earnings / FDA |
| `otm_call_accumulation` | High-volume OTM call buying, low delta |
| `put_wall_buildup` | Large put OI at a specific strike |
| `dark_pool_print` | Single print >> typical block size |
| `combo_detected` | Multi-leg structure (straddle, spread, collar, etc.) |
| `peer_sync` | 3+ peers showing same direction within 30 min |
| `theme_sync` | 4+ theme members showing coordinated flow |
| `oi_velocity_spike` | OI change rate > 5× 5-day mean |
| `after_hours_print` | Large-notional print outside 9:30–16:00 ET |
| `gamma_pin` | Clustering of OI near round-number strikes |
| `iv_crush_buy` | IV lower than expected before an event |

### 3.2 Combo Detector

Recognizes multi-leg structures from two legs arriving within 2 seconds:

- Straddle / Strangle
- Call Spread / Put Spread
- Risk Reversal (collar)
- Calendar Spread
- Butterfly / Condor

### 3.3 Signal Aggregator

Deduplicates and merges related detections into a single `DetectedSignalPayload` before scoring.

---

## 4. Scoring Engine

### 4.1 Dimensions (11 total)

Each dimension returns a score [0–100]. Descriptions in `src/lib/scoring/dimensions.ts`.

### 4.2 Composite Score

```
score = Σ (dimension_score × weight)
```

Weights are defined in `DETECTION_CONFIG.scoringWeights` in `src/lib/detection/config.ts` and configurable via `AppSettings`.

### 4.3 Direction Inference

Direction is inferred from:
1. Multi-leg combo structure (put_spread → bearish, call_spread → bullish, straddle → neutral)
2. Aggressor side (aggressor buying calls → bullish, buying puts → bearish, selling calls → bearish, selling puts → bullish)
3. Fallback: contract type (call → bullish, put → bearish)

### 4.4 Confidence Score

Fraction of active dimensions scoring ≥ 60, plus additive boosts for strong primary signals (volOi, notional, eventProximity, directionality), clamped to [0, 1].

---

## 5. Quality Control Layer

All signals pass through QC before publication. See `src/lib/detection/quality-control.ts`.

### 5.1 Hard Gates (suppress)

- `negative_dte` — Contract already expired
- `tiny_lot` — Below absolute contract floor (50 cts)
- `micro_premium` — Below $10K total premium
- `broken_quote` — Negative IV, IV > 1000%, premium < $0.01/contract
- `stale_duplicate` — Same contract/direction within dedup window (5 min)
- `off_hours_low_score` — Score below off-hours minimum (70) and market is closed

### 5.2 Soft Penalties (score reduction, max −30 pts)

- `small_lot` — Between soft (100) and hard (50) contract floor: penalty proportional to deficit
- `low_premium` — Between $10K and $50K: penalty proportional to deficit
- `weak_direction` — Confidence < 40%: penalty proportional to deficit

### 5.3 QC Statistics

`getQCStats()` returns total/passed/suppressed/penalised counts and per-reason breakdowns, surfaced on the `/quality` dashboard.

---

## 6. Market Hours Awareness

`getMarketTimeContext()` in `src/lib/market-hours.ts` determines the current market session:

| Session | ET Window |
|---------|-----------|
| `pre_market` | 04:00 – 09:30 |
| `market_open` | 09:30 – 10:00 |
| `mid_session` | 10:00 – 15:30 |
| `market_close` | 15:30 – 16:00 |
| `after_hours` | 16:00 – 20:00 |
| `closed` | 20:00 – 04:00 + weekends + NYSE holidays |

NYSE holidays for 2025–2026 are hardcoded. Market-session-aware scoring reduces the `timeOfDay` dimension weight for off-hours signals.

---

## 7. Feed Post Format

Each signal that passes QC is enriched into a `FeedPost`:

```
{emoji} {SYMBOL} — ${premium} {direction} {signalType} | {strike}{C/P} {expiry} | Score {score}

{Narrative body explaining the trade and why it's unusual}
⚡ {N}d to {event} — {context sentence}
Signal score: {score}/100 (confidence: {pct}%)

Tags: #{Signal type} #{Direction} #{Catalyst} ...
```

---

## 8. Test Fixtures

7 archetypal scenarios in `src/data/test-fixtures.ts` for QA, backtest replay, and regression testing:

| ID | Scenario | Symbol | Direction |
|----|----------|--------|-----------|
| `fixture_earnings_runup` | Pre-earnings call sweep | NVDA | Bullish |
| `fixture_pdufa_spec` | FDA binary-event speculation | MRNA | Bullish |
| `fixture_macro_hedge` | FOMC put spread hedge | SPY | Bearish |
| `fixture_no_catalyst` | No-known-event informed flow | PLTR | Bullish |
| `fixture_saas_theme_sync` | Theme-wide SaaS sync | SNOW | Bullish |
| `fixture_bearish_hedge` | Institutional put spread | QQQ | Bearish |
| `fixture_combo_straddle` | ATM straddle vol bet | TSLA | Neutral |

---

## 9. API Resilience

`src/lib/api/resilience.ts` provides:

- **`fetchWithRetry`** — Exponential backoff + jitter, up to 3 retries, Retry-After header aware
- **`fetchCached`** — In-memory TTL cache with stale-while-revalidate
- **`Batcher`** — Request batching for high-fanout queries (e.g., enriching 20 signals)
- **`withFallback`** — Graceful degradation to a fallback value when a fetch fails
- In-flight deduplication to prevent thundering-herd during bursts

---

## 10. Settings Surface

All detection and QC thresholds are user-tunable via the `/settings` page:

**Noise filters:** minSignalScore, minNotional, minContracts, maxDte
**Vol/OI tiers:** noteworthy (0.5×), unusual (1.0×), extreme (2.5×)
**Notional tiers:** large ($250K), huge ($1M), whale ($5M)
**QC parameters:** offHoursMinScore, dedupWindowMinutes, suppressTinyLot, suppressDuplicates
**Publication gate:** minPublishScore
**Breaking sensitivity:** low / medium / high
**Display:** soundAlerts, alertThreshold, autoRefresh, refreshInterval

---

## 11. Non-Goals (V1)

- Order flow dark-pool reconstruction
- Options market-maker flow filtering
- Real-time P&L tracking on detected signals
- SMS / push notification delivery
- Multi-user accounts or auth
- Social features (comments, following, upvotes)

---

## 12. Production Readiness Gaps

| Gap | Priority | Owner |
|-----|----------|-------|
| Connect Polygon WebSocket → Trade Ingestion Worker | HIGH | Backend |
| Real PostgreSQL schema migration + seed | HIGH | Backend |
| Peer enricher + theme enricher (real DB join, not mock map) | HIGH | Backend |
| Earnings / FDA / macro event calendar integration | HIGH | Backend |
| WebSocket heartbeat + reconnect logic | MED | Backend |
| End-to-end unit tests for all 16 detectors | MED | QA |
| Rate-limiting on API routes (DDoS protection) | MED | Backend |
| HTTPS + CSP headers in production | MED | DevOps |
| Sentry / Datadog integration (plug `registerErrorHook`) | MED | Backend |
| Redis fallback to in-memory cache on Redis failure | LOW | Backend |
