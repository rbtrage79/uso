import { NextResponse } from "next/server";
import { isMockMode } from "@/lib/polygon/client";
import { generateMockChain } from "@/lib/polygon/mock";
import { getOptionsChain } from "@/lib/polygon/rest/options-chain";
import { getStockSnapshot } from "@/lib/polygon/rest/stock-data";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const underlying = url.searchParams.get("underlying")?.toUpperCase();
  const dte = parseInt(url.searchParams.get("dte") ?? "30");

  if (!underlying) {
    return NextResponse.json({ error: "underlying is required" }, { status: 400 });
  }

  if (isMockMode()) {
    const spotBySymbol: Record<string, number> = {
      AAPL: 228, NVDA: 875, TSLA: 248, SPY: 594, QQQ: 518,
      META: 582, AMD: 168, AMZN: 223, MRNA: 38, XBI: 91,
    };
    const spot = spotBySymbol[underlying] ?? 100;
    const chain = generateMockChain(underlying, spot, dte);
    return NextResponse.json({ results: chain, status: "OK" });
  }

  try {
    const [snapshot, chain] = await Promise.all([
      getStockSnapshot(underlying),
      getOptionsChain(underlying, {}),
    ]);
    return NextResponse.json({ results: chain, spot: snapshot?.lastTrade?.p, status: "OK" });
  } catch (err) {
    console.error("[chain API]", err);
    return NextResponse.json({ error: "Failed to fetch chain" }, { status: 500 });
  }
}
