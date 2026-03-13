/**
 * POST /api/enrich
 *
 * Enriches a set of detected signals with event, peer, theme, factor,
 * insight, and ranking context.
 *
 * Body: { signals: DetectedSignalPayload[] }
 * Response: { enriched: FullyEnrichedSignal[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { enrichSignalBatch } from "@/lib/enrichment/signal-enricher";
import { detectThemeClusters } from "@/lib/enrichment/theme-enricher";
import { detectFactorRotations } from "@/lib/enrichment/factor-enricher";
import { MOCK_SIGNALS } from "@/data/mock-signals";
import type { DetectedSignalPayload } from "@/types/signals";

function isMockMode(): boolean {
  return process.env.MOCK_MODE === "true" || !process.env.POLYGON_API_KEY;
}

export async function POST(req: NextRequest) {
  try {
    let payloads: DetectedSignalPayload[];

    if (isMockMode()) {
      // Convert mock signals to DetectedSignalPayload shape
      payloads = MOCK_SIGNALS.map((s) => ({
        symbol: s.symbol,
        signalType: s.signalType,
        direction: s.direction,
        totalScore: s.totalScore,
        confidence: s.confidence,
        totalPremium: s.totalPremium,
        totalContracts: s.totalContracts,
        isCombo: s.isCombo,
        scoreVolOi: s.scoreBreakdown.volOi,
        scoreNotional: s.scoreBreakdown.notional,
        scoreEventProximity: s.scoreBreakdown.eventProximity,
        scorePeerSync: s.scoreBreakdown.peerSync,
        scoreDirectionality: s.scoreBreakdown.directionality,
        scoreNovelty: s.scoreBreakdown.novelty,
        underlyingPrice: s.context.underlyingPrice,
        nearestEventType: s.context.nearestEventType,
        nearestEventDate: s.context.nearestEventDate,
        daysToNearestEvent: s.context.daysToNearestEvent,
        legs: s.legs.map((l) => ({
          contractTicker: l.contractTicker,
          underlying: s.symbol,
          expirationDate: l.expiration,
          strike: l.strike,
          optionType: l.optionType,
          dte: l.dte,
          side: l.side,
          quantity: l.quantity,
          premium: l.premium,
          priceAtTrade: l.premium / l.quantity / 100,
          impliedVol: l.impliedVol,
          delta: l.delta,
          openInterest: l.openInterest,
          tradeTime: s.detectedAt,
        })),
      }));
    } else {
      const body = await req.json();
      payloads = body.signals as DetectedSignalPayload[];
    }

    const enriched = await enrichSignalBatch(payloads);

    // Also compute global cluster views
    const themeSignals = payloads.map((p) => ({
      symbol: p.symbol,
      direction: p.direction,
      totalScore: p.totalScore,
      totalPremium: p.totalPremium,
    }));
    const themeClusters = detectThemeClusters(themeSignals);
    const factorRotations = detectFactorRotations(themeSignals);

    return NextResponse.json({
      enriched,
      themeClusters,
      factorRotations,
      count: enriched.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[/api/enrich]", err);
    return NextResponse.json({ error: "Enrichment failed" }, { status: 500 });
  }
}

/** GET /api/enrich — enrich mock signals, for quick testing */
export async function GET() {
  const payloads: DetectedSignalPayload[] = MOCK_SIGNALS.map((s) => ({
    symbol: s.symbol,
    signalType: s.signalType,
    direction: s.direction,
    totalScore: s.totalScore,
    confidence: s.confidence,
    totalPremium: s.totalPremium,
    totalContracts: s.totalContracts,
    isCombo: s.isCombo,
    scoreVolOi: s.scoreBreakdown.volOi,
    scoreNotional: s.scoreBreakdown.notional,
    scoreEventProximity: s.scoreBreakdown.eventProximity,
    scorePeerSync: s.scoreBreakdown.peerSync,
    scoreDirectionality: s.scoreBreakdown.directionality,
    scoreNovelty: s.scoreBreakdown.novelty,
    underlyingPrice: s.context.underlyingPrice,
    legs: s.legs.map((l) => ({
      contractTicker: l.contractTicker,
      underlying: s.symbol,
      expirationDate: l.expiration,
      strike: l.strike,
      optionType: l.optionType,
      dte: l.dte,
      side: l.side,
      quantity: l.quantity,
      premium: l.premium,
      priceAtTrade: l.premium / l.quantity / 100,
      impliedVol: l.impliedVol,
      delta: l.delta,
      openInterest: l.openInterest,
      tradeTime: s.detectedAt,
    })),
  }));

  const enriched = await enrichSignalBatch(payloads);
  const themeSignals = payloads.map((p) => ({
    symbol: p.symbol, direction: p.direction,
    totalScore: p.totalScore, totalPremium: p.totalPremium,
  }));
  const themeClusters = detectThemeClusters(themeSignals);
  const factorRotations = detectFactorRotations(themeSignals);

  return NextResponse.json({ enriched, themeClusters, factorRotations, count: enriched.length });
}
