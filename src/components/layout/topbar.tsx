"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw, Bell } from "lucide-react";
import { cn } from "@/lib/utils/formatting";

interface TopbarProps {
  symbol?: string;
}

const TICKER_ITEMS = [
  { sym: "NVDA", price: "875.40", chg: "+2.17%", bull: true },
  { sym: "AAPL", price: "228.52", chg: "+0.59%", bull: true },
  { sym: "TSLA", price: "248.30", chg: "-1.27%", bull: false },
  { sym: "SPY",  price: "594.10", chg: "+0.14%", bull: true },
  { sym: "QQQ",  price: "518.40", chg: "+0.21%", bull: true },
  { sym: "META", price: "582.00", chg: "+0.90%", bull: true },
  { sym: "AMD",  price: "168.30", chg: "-1.23%", bull: false },
  { sym: "AMZN", price: "223.40", chg: "+1.04%", bull: true },
];

export function Topbar({ symbol }: TopbarProps) {
  const [time, setTime] = useState("");
  const [isLive, setIsLive] = useState(false);

  const isMock = process.env.NEXT_PUBLIC_MOCK_MODE !== "false";

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "America/New_York",
        }) + " ET",
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex items-center h-10 bg-surface border-b border-surface-border px-4 gap-4 shrink-0">
      {/* Ticker tape */}
      <div className="flex-1 overflow-hidden relative">
        <div className="flex items-center gap-6 animate-ticker whitespace-nowrap">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-zinc-400 font-medium">{item.sym}</span>
              <span className="text-zinc-300">{item.price}</span>
              <span className={cn("font-medium", item.bull ? "text-bull" : "text-bear")}>
                {item.chg}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Mock mode badge */}
        {isMock && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-signal-gold/10 border border-signal-gold/20 text-signal-gold font-bold">
            MOCK
          </span>
        )}

        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          {isLive ? (
            <Wifi className="w-3.5 h-3.5 text-bull" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-zinc-500" />
          )}
          <span className={cn("text-xs font-mono", isLive ? "text-bull" : "text-zinc-500")}>
            {isLive ? "LIVE" : "OFFLINE"}
          </span>
        </div>

        {/* Clock */}
        <span className="text-xs font-mono text-zinc-400">{time}</span>

        {/* Alert bell */}
        <button className="text-zinc-500 hover:text-zinc-300 transition-colors relative">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
