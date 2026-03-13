# Unusual Flow Radar — Launch Checklist

Use this checklist before going from mock mode to a live production deployment.
Check items off in order — later items depend on earlier ones.

---

## Phase 1 — Infrastructure

- [ ] **PostgreSQL provisioned** — Neon, Railway, or self-hosted PG 14+
- [ ] **Redis provisioned** — Upstash or self-hosted Redis 7+
- [ ] **`.env.local` complete** — All required vars filled in (POLYGON_API_KEY, DATABASE_URL, REDIS_URL)
- [ ] **MOCK_MODE=false** — Both `MOCK_MODE` and `NEXT_PUBLIC_MOCK_MODE` set to `false`
- [ ] **`npx prisma db push` run** — Schema applied to the production database
- [ ] **`npx prisma generate` run** — Prisma client regenerated

---

## Phase 2 — Data Pipeline

- [ ] **Polygon API key validated** — Test with: `curl "https://api.polygon.io/v2/aggs/ticker/AAPL/prev?apiKey=$POLYGON_API_KEY"`
- [ ] **WebSocket connection tested** — Polygon WS connects, options trade feed subscribes successfully
- [ ] **Trade Ingestion Worker starts** — `src/lib/workers/trade-ingestion.worker.ts` processes trades without errors
- [ ] **BullMQ queues visible** — `trade-ingestion` and `signal-publish` queues appear in Bull Board (or logs)
- [ ] **Detection engine fires** — At least one signal detected within 15 min of market open
- [ ] **Signal persists to DB** — `DetectedSignal` row created in PostgreSQL after detection
- [ ] **Feed API returns live data** — `GET /api/signals` returns real signals (not mock fallback)

---

## Phase 3 — Enrichment

- [ ] **Peer enricher active** — `scorePeerSync` receives real peer-group activity, not default 0
- [ ] **Theme enricher active** — `scoreThemeSync` receives theme bucket activity
- [ ] **Earnings calendar connected** — `nearestEventType: "earnings"` appears with correct dates
- [ ] **FDA calendar connected** — `nearestEventType: "fda"` appears for biotech names
- [ ] **Macro event calendar connected** — FOMC, CPI, PPI dates appear

---

## Phase 4 — Quality Assurance

- [ ] **Unit tests pass** — `npm test` exits 0; all scorer + QC layer tests green
- [ ] **Backtest Lite — all 7 fixtures pass** — `/backtest-lite` → Scenario Replay → all green
- [ ] **No TypeScript errors** — `npx tsc --noEmit` exits 0
- [ ] **No ESLint errors** — `npm run lint` exits 0
- [ ] **Build succeeds** — `npm run build` exits 0 without warnings treated as errors
- [ ] **Health endpoint healthy** — `GET /api/health` returns `{"status":"healthy"}`
- [ ] **QC pass rate > 60%** — `/quality` dashboard shows reasonable suppression ratio

---

## Phase 5 — Hardening

- [ ] **API retry / fallback tested** — Kill Polygon WS connection; confirm graceful degradation, no crash
- [ ] **Redis failover tested** — Stop Redis; confirm in-memory fallback activates, no 500 errors
- [ ] **Off-hours filter tested** — Send a low-score signal outside market hours; confirm suppression
- [ ] **Dedup tested** — Send same signal twice within 5 min; confirm second is suppressed
- [ ] **Broken quote rejected** — Send a signal with IV = -0.5; confirm `broken_quote` suppression
- [ ] **Rate limit respected** — Confirm Polygon WS reconnect uses exponential backoff on 429

---

## Phase 6 — Production Config

- [ ] **NODE_ENV=production** — Confirm structured JSON logging in prod mode
- [ ] **Log level set** — `LOG_LEVEL=info` (or `warn`) in production
- [ ] **Error tracking wired** — `registerErrorHook` called with Sentry/Datadog client
- [ ] **CORS headers set** — `/api/*` routes only accept requests from `NEXT_PUBLIC_APP_URL`
- [ ] **Rate limiting on API routes** — Prevent abuse of `/api/backtest/simulate`
- [ ] **`Cache-Control` headers correct** — `/api/health` has `no-store`; signal list has short TTL
- [ ] **No secrets in client bundle** — `POLYGON_API_KEY` and `DATABASE_URL` not prefixed with `NEXT_PUBLIC_`
- [ ] **`.env.local` not in git** — `git status` shows `.env.local` is untracked (in `.gitignore`)

---

## Phase 7 — Monitoring

- [ ] **`/api/health` polled by monitoring** — Uptime Robot / BetterStack checks every 60s
- [ ] **Alert on `status: degraded`** — PagerDuty / Slack webhook for status downgrades
- [ ] **Redis memory alert** — Alert if Redis memory > 80% of instance size
- [ ] **DB connection pool alert** — Alert if Prisma connection pool exhausted
- [ ] **Worker queue depth alert** — Alert if `trade-ingestion` queue depth > 1000 jobs
- [ ] **Error rate alert** — Alert if `/api/health` `errors.last5min` > 20

---

## Phase 8 — Go Live

- [ ] **Smoke test on real market data** — Watch feed for 30 min during market open; verify signal quality
- [ ] **Backtest sanity check** — Run simulation on today's date; check result distribution looks correct
- [ ] **Signal quality dashboard reviewed** — QC pass rate, confidence distribution, top tickers all look sensible
- [ ] **Settings defaults validated** — Default thresholds produce a healthy signal rate (5–30 per session)

---

## Post-Launch

- [ ] **Weekly: review suppression breakdown** — High `stale_duplicate` is normal; sudden spike in `broken_quote` = data feed issue
- [ ] **Weekly: audit false positives** — Tag signals that moved against direction; use to retune weights
- [ ] **Monthly: recalibrate thresholds** — As IV regime changes, `volOiUnusual` and notional tiers may need adjustment
- [ ] **Quarterly: update NYSE holiday set** — `src/lib/market-hours.ts` — add next year's holidays
