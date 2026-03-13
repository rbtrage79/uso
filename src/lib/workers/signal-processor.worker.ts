/**
 * Signal Processor Worker — consumes from signal-processor queue,
 * persists to DB, generates feed post, publishes downstream.
 * Run: npm run worker:signal
 */

import { Worker } from "bullmq";
import { QUEUE_NAMES, type SignalProcessorJob, feedPublisherQueue } from "./queue";
import { formatSignalPost } from "@/lib/enrichment/feed-formatter";
import { DETECTION_CONFIG as CFG } from "@/lib/detection/config";

const worker = new Worker<SignalProcessorJob>(
  QUEUE_NAMES.SIGNAL_PROCESSOR,
  async (job) => {
    const { signalPayload } = job.data;
    const { prisma } = await import("@/lib/db/prisma");

    // Upsert underlying
    await prisma.underlying.upsert({
      where: { symbol: signalPayload.symbol },
      create: { symbol: signalPayload.symbol, name: signalPayload.symbol },
      update: {},
    });

    // Upsert contracts for each leg
    for (const leg of signalPayload.legs) {
      await prisma.optionContract.upsert({
        where: { ticker: leg.contractTicker },
        create: {
          ticker: leg.contractTicker,
          underlying: leg.underlying,
          expirationDate: leg.expirationDate,
          strike: leg.strike,
          optionType: leg.optionType,
          initialDte: leg.dte,
        },
        update: {},
      });
    }

    // Create signal
    const signal = await prisma.detectedSignal.create({
      data: {
        symbol: signalPayload.symbol,
        signalType: signalPayload.signalType,
        direction: signalPayload.direction,
        totalScore: signalPayload.totalScore,
        confidence: signalPayload.confidence,
        totalPremium: signalPayload.totalPremium,
        totalContracts: signalPayload.totalContracts,
        isCombo: signalPayload.isCombo,
        scoreVolOi: signalPayload.scoreVolOi,
        scoreNotional: signalPayload.scoreNotional,
        scoreTimeOfDay: signalPayload.scoreTimeOfDay,
        scoreIvAbnormality: signalPayload.scoreIvAbnormality,
        scoreOiVelocity: signalPayload.scoreOiVelocity,
        scoreEventProximity: signalPayload.scoreEventProximity,
        scorePeerSync: signalPayload.scorePeerSync,
        scoreDirectionality: signalPayload.scoreDirectionality,
        scoreCombo: signalPayload.scoreCombo,
        scoreThemeSync: signalPayload.scoreThemeSync,
        scoreNovelty: signalPayload.scoreNovelty,
        underlyingPrice: signalPayload.underlyingPrice,
        nearestEventType: signalPayload.nearestEventType,
        nearestEventDate: signalPayload.nearestEventDate,
        daysToNearestEvent: signalPayload.daysToNearestEvent,
        legs: {
          create: signalPayload.legs.map((leg, i) => ({
            contractTicker: leg.contractTicker,
            legNumber: i + 1,
            strike: leg.strike,
            expiration: leg.expirationDate,
            optionType: leg.optionType,
            dte: leg.dte,
            side: leg.side,
            quantity: leg.quantity,
            premium: leg.premium,
            priceAtTrade: leg.priceAtTrade,
            underlyingPriceAtTrade: leg.underlyingPrice,
            impliedVol: leg.impliedVol,
            delta: leg.delta,
            openInterest: leg.openInterest,
            dayVolume: leg.dayVolume,
            tradeTime: leg.tradeTime,
          })),
        },
      },
    });

    // Generate and queue feed post if above publish threshold
    if (signalPayload.totalScore >= CFG.minScoreToPublish) {
      const post = formatSignalPost(signalPayload, signal.id);
      await feedPublisherQueue.add("publish-post", {
        signalId: signal.id,
        post,
      });
    }

    return { signalId: signal.id };
  },
  {
    connection: { url: process.env.REDIS_QUEUE_URL ?? process.env.REDIS_URL ?? "redis://localhost:6379" },
    concurrency: parseInt(process.env.SIGNAL_PROCESSOR_CONCURRENCY ?? "2"),
  },
);

worker.on("completed", (job, result) => {
  console.log(`[signal-processor] ✓ job ${job.id} → signalId ${result?.signalId}`);
});

worker.on("failed", (job, err) => {
  console.error(`[signal-processor] ✗ job ${job?.id}: ${err.message}`);
});

console.log("[signal-processor] worker started");
