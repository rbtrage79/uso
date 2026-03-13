"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Settings,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils/formatting";

const NAV = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Dashboard",      badge: null },
  { href: "/feed",          icon: Zap,             label: "Flow Feed",      badge: "LIVE" },
  { href: "/themes",        icon: TrendingUp,      label: "Themes",         badge: null },
  { href: "/quality",       icon: ShieldCheck,     label: "Signal Quality", badge: null },
  { href: "/backtest-lite", icon: FlaskConical,    label: "Backtest Lite",  badge: null },
  { href: "/settings",      icon: Settings,        label: "Settings",       badge: null },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useAppStore();

  return (
    <aside
      className={cn(
        "flex flex-col bg-surface border-r border-surface-border transition-all duration-200 shrink-0",
        sidebarOpen ? "w-56" : "w-14",
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 border-b border-surface-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-signal-cyan/20 border border-signal-cyan/30 shrink-0">
          <Zap className="w-4 h-4 text-signal-cyan" />
        </div>
        {sidebarOpen && (
          <div className="min-w-0">
            <p className="text-xs font-bold text-white tracking-wider truncate">UNUSUAL FLOW</p>
            <p className="text-[10px] text-zinc-500 truncate">RADAR</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-1">
        {NAV.map(({ href, icon: Icon, label, badge }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-colors group",
                active
                  ? "bg-signal-cyan/10 text-signal-cyan border border-signal-cyan/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-surface-raised",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && (
                <span className="flex-1 truncate">{label}</span>
              )}
              {sidebarOpen && badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-bull/20 text-bull font-bold">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="flex items-center justify-center h-10 border-t border-surface-border text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </aside>
  );
}
