"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts";
import { formatDollar } from "@/lib/utils/formatting";

// Mock intraday flow data
const INTRADAY_FLOW = Array.from({ length: 26 }, (_, i) => {
  const hour = 9 + Math.floor((30 + i * 15) / 60);
  const minute = (30 + i * 15) % 60;
  const label = `${hour}:${minute.toString().padStart(2, "0")}`;
  const base = 2_000_000;
  const bull = base * (0.4 + Math.random() * 0.8);
  const bear = base * (0.2 + Math.random() * 0.5);
  return { time: label, bullPremium: Math.round(bull), bearPremium: Math.round(bear) };
});

export function IntradayFlowChart() {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={INTRADAY_FLOW} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis
          dataKey="time"
          tick={{ fill: "#52525b", fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: "#1e1e2e" }}
          interval={3}
        />
        <YAxis
          tickFormatter={(v) => formatDollar(v)}
          tick={{ fill: "#52525b", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={55}
        />
        <Tooltip
          contentStyle={{ background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 6 }}
          labelStyle={{ color: "#a1a1aa", fontSize: 11 }}
          formatter={(v: number, name: string) => [formatDollar(v), name === "bullPremium" ? "Bullish" : "Bearish"]}
        />
        <Bar dataKey="bullPremium" stackId="a" fill="#22c55e" opacity={0.8} radius={[0,0,0,0]} />
        <Bar dataKey="bearPremium" stackId="a" fill="#ef4444" opacity={0.8} radius={[2,2,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PremiumAreaChart({ data }: { data: { time: string; premium: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="premGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
        <XAxis dataKey="time" tick={{ fill: "#52525b", fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(v) => formatDollar(v)} tick={{ fill: "#52525b", fontSize: 10 }} tickLine={false} axisLine={false} width={55} />
        <Tooltip contentStyle={{ background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 6 }} labelStyle={{ color: "#a1a1aa", fontSize: 11 }} formatter={(v: number) => [formatDollar(v), "Premium"]} />
        <Area type="monotone" dataKey="premium" stroke="#06b6d4" strokeWidth={1.5} fill="url(#premGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
