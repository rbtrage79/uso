import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tradeCount = Math.min(parseInt(body.tradeCount ?? "500"), 2000);
    const unusualRate = Math.min(parseFloat(body.unusualRate ?? "0.15"), 0.5);

    const { runSimulation } = await import("@/lib/detection/simulator");
    const result = await runSimulation({ tradeCount, unusualRate });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[backtest API]", err);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
