/**
 * BullMQ queue definitions — trade ingestion and signal processing pipelines.
 */

import { Queue, Worker, QueueEvents } from "bullmq";
import { getRedis } from "@/lib/redis/client";

const connection = { url: process.env.REDIS_QUEUE_URL ?? process.env.REDIS_URL ?? "redis://localhost:6379" };

// ─── Queue names ──────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  TRADE_INGESTION: "trade-ingestion",
  SIGNAL_PROCESSOR: "signal-processor",
  FEED_PUBLISHER: "feed-publisher",
} as const;

// ─── Trade Ingestion Queue ────────────────────────────────────────────────────

export interface TradeIngestionJob {
  trades: Array<{
    sym: string;
    p: number;
    s: number;
    t: number;
    x: number;
    c: number[];
    q: number;
  }>;
  batchSize: number;
}

export const tradeIngestionQueue = new Queue<TradeIngestionJob>(
  QUEUE_NAMES.TRADE_INGESTION,
  {
    connection,
    defaultJobOptions: {
      removeOnComplete: 200,
      removeOnFail: 50,
      attempts: 2,
      backoff: { type: "exponential", delay: 500 },
    },
  },
);

// ─── Signal Processor Queue ───────────────────────────────────────────────────

export interface SignalProcessorJob {
  signalPayload: import("@/types/signals").DetectedSignalPayload;
}

export const signalProcessorQueue = new Queue<SignalProcessorJob>(
  QUEUE_NAMES.SIGNAL_PROCESSOR,
  {
    connection,
    defaultJobOptions: {
      removeOnComplete: 500,
      removeOnFail: 100,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    },
  },
);

// ─── Feed Publisher Queue ─────────────────────────────────────────────────────

export interface FeedPublisherJob {
  signalId: string;
  post: import("@/types/signals").FeedPostPayload;
}

export const feedPublisherQueue = new Queue<FeedPublisherJob>(
  QUEUE_NAMES.FEED_PUBLISHER,
  {
    connection,
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 50,
      delay: 0,
    },
  },
);

export function getQueueDashboardOptions() {
  return {
    queues: [tradeIngestionQueue, signalProcessorQueue, feedPublisherQueue],
  };
}
