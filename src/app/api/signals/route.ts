import { NextResponse } from "next/server";
import { SignalFiltersSchema } from "@/schemas/signals";
import { isMockMode } from "@/lib/polygon/client";
import { MOCK_SIGNALS } from "@/data/mock-signals";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = SignalFiltersSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const filters = parsed.data;

  if (isMockMode()) {
    let signals = [...MOCK_SIGNALS];
    if (filters.direction && filters.direction !== "all") {
      signals = signals.filter((s) => s.direction === filters.direction);
    }
    if (filters.minScore) signals = signals.filter((s) => s.totalScore >= filters.minScore!);
    if (filters.minPremium) signals = signals.filter((s) => s.totalPremium >= filters.minPremium!);
    if (filters.signalType && filters.signalType !== "all") {
      signals = signals.filter((s) => s.signalType === filters.signalType);
    }
    if (filters.maxDte) {
      signals = signals.filter((s) => s.legs.every((l) => l.dte <= filters.maxDte!));
    }
    const total = signals.length;
    const sliced = signals.slice(filters.offset, filters.offset + filters.limit);
    return NextResponse.json({
      signals: sliced,
      total,
      hasMore: filters.offset + filters.limit < total,
    });
  }

  // Real DB query (Prisma) — production path
  try {
    const { prisma } = await import("@/lib/db/prisma");
    const where: Record<string, unknown> = {};
    if (filters.direction && filters.direction !== "all") where.direction = filters.direction;
    if (filters.minScore) where.totalScore = { gte: filters.minScore };
    if (filters.minPremium) where.totalPremium = { gte: filters.minPremium };
    if (filters.signalType && filters.signalType !== "all") where.signalType = filters.signalType;

    const [signals, total] = await Promise.all([
      prisma.detectedSignal.findMany({
        where,
        include: { legs: true, feedPosts: { take: 1, orderBy: { createdAt: "desc" } } },
        orderBy: { detectedAt: "desc" },
        take: filters.limit,
        skip: filters.offset,
      }),
      prisma.detectedSignal.count({ where }),
    ]);

    return NextResponse.json({ signals, total, hasMore: filters.offset + filters.limit < total });
  } catch (err) {
    console.error("[signals API]", err);
    return NextResponse.json({ error: "Failed to fetch signals" }, { status: 500 });
  }
}
