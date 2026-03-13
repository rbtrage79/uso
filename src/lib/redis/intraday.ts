/**
 * Redis helpers for intraday rolling state.
 *
 * Key patterns:
 *   ufr:vol:{ticker}          SORTED SET  timestamp → size (5-min TTL)
 *   ufr:baseline:{ticker}     HASH        openInterest, avgVolume, impliedVol, etc.
 *   ufr:bucket:{ticker}:{idx} STRING      bucket volume count (1-day TTL)
 *   ufr:callput:{underlying}  HASH        callPremium, putPremium (intraday)
 *   ufr:theme:{themeId}       ZSET        signal scores by ticker
 */

import { getRedis } from "./client";

const TTL_5MIN = 300;
const TTL_1DAY = 86_400;
const TTL_1HOUR = 3_600;

// ─── Volume accumulation ──────────────────────────────────────────────────────

export async function addTradeToVolume(
  ticker: string,
  size: number,
  ts = Date.now(),
): Promise<void> {
  const r = getRedis();
  const key = `ufr:vol:${ticker}`;
  await r.zadd(key, ts, `${ts}:${size}`);
  await r.expire(key, TTL_5MIN);
}

export async function getRecentVolume(
  ticker: string,
  windowMs = 300_000,
): Promise<number> {
  const r = getRedis();
  const key = `ufr:vol:${ticker}`;
  const cutoff = Date.now() - windowMs;
  const members = await r.zrangebyscore(key, cutoff, "+inf");
  return members.reduce((sum, m) => {
    const [, sizeStr] = m.split(":");
    return sum + (parseInt(sizeStr) || 0);
  }, 0);
}

// ─── Baselines ────────────────────────────────────────────────────────────────

export async function setContractBaseline(
  ticker: string,
  data: Record<string, string | number>,
): Promise<void> {
  const r = getRedis();
  const key = `ufr:baseline:${ticker}`;
  await r.hmset(key, data as Record<string, string>);
  await r.expire(key, TTL_1DAY);
}

export async function getContractBaseline(
  ticker: string,
): Promise<Record<string, string> | null> {
  const r = getRedis();
  const key = `ufr:baseline:${ticker}`;
  const data = await r.hgetall(key);
  return Object.keys(data).length > 0 ? data : null;
}

// ─── Intraday 30-min buckets ──────────────────────────────────────────────────

export async function incrementBucket(
  ticker: string,
  bucketIdx: number,
  amount: number,
): Promise<void> {
  const r = getRedis();
  const key = `ufr:bucket:${ticker}:${bucketIdx}`;
  await r.incrby(key, amount);
  await r.expire(key, TTL_1DAY);
}

export async function getBucketVolume(
  ticker: string,
  bucketIdx: number,
): Promise<number> {
  const r = getRedis();
  const key = `ufr:bucket:${ticker}:${bucketIdx}`;
  const val = await r.get(key);
  return parseInt(val ?? "0");
}

// ─── Call/Put premium tracker ─────────────────────────────────────────────────

export async function trackPremium(
  underlying: string,
  side: "call" | "put",
  premium: number,
): Promise<void> {
  const r = getRedis();
  const key = `ufr:callput:${underlying}`;
  await r.hincrbyfloat(key, side === "call" ? "callPremium" : "putPremium", premium);
  await r.expire(key, TTL_1DAY);
}

export async function getCallPutRatio(underlying: string): Promise<{
  callPremium: number;
  putPremium: number;
  ratio: number;
}> {
  const r = getRedis();
  const key = `ufr:callput:${underlying}`;
  const data = await r.hgetall(key);
  const callPremium = parseFloat(data.callPremium ?? "0");
  const putPremium = parseFloat(data.putPremium ?? "0");
  const total = callPremium + putPremium;
  return {
    callPremium,
    putPremium,
    ratio: total > 0 ? callPremium / total : 0.5,
  };
}

// ─── Theme signal tracking ────────────────────────────────────────────────────

export async function recordThemeSignal(
  themeId: string,
  symbol: string,
  score: number,
): Promise<void> {
  const r = getRedis();
  const key = `ufr:theme:${themeId}`;
  await r.zadd(key, score, symbol);
  await r.expire(key, TTL_1HOUR);
}

export async function getThemeSignals(
  themeId: string,
): Promise<Array<{ symbol: string; score: number }>> {
  const r = getRedis();
  const key = `ufr:theme:${themeId}`;
  const members = await r.zrangebyscore(key, "-inf", "+inf", "WITHSCORES");
  const results: Array<{ symbol: string; score: number }> = [];
  for (let i = 0; i < members.length; i += 2) {
    results.push({ symbol: members[i], score: parseFloat(members[i + 1]) });
  }
  return results;
}
