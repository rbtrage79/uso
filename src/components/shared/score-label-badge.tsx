"use client";

import {
  Ghost,
  CalendarClock,
  Shield,
  Rocket,
  Waves,
  Network,
  ArrowLeftRight,
  GitMerge,
  HelpCircle,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SCORE_LABEL_META } from "@/types/features";
import type { ScoreLabel } from "@/types/features";
import { cn } from "@/lib/utils/formatting";

const ICON_MAP: Record<string, LucideIcon> = {
  Ghost,
  CalendarClock,
  Shield,
  Rocket,
  Waves,
  Network,
  ArrowLeftRight,
  GitMerge,
  HelpCircle,
  Zap,
};

interface ScoreLabelBadgeProps {
  label: ScoreLabel;
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function ScoreLabelBadge({ label, size = "sm", className }: ScoreLabelBadgeProps) {
  const meta = SCORE_LABEL_META[label];
  const Icon = ICON_MAP[meta.icon] ?? HelpCircle;

  if (size === "xs") {
    return (
      <span
        title={label}
        className={cn(
          "inline-flex items-center justify-center w-4 h-4 rounded border",
          meta.bgColor,
          meta.borderColor,
          className,
        )}
      >
        <Icon className={cn("w-2.5 h-2.5", meta.color)} />
      </span>
    );
  }

  if (size === "sm") {
    return (
      <span
        title={meta.description}
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium whitespace-nowrap",
          meta.bgColor,
          meta.borderColor,
          meta.color,
          className,
        )}
      >
        <Icon className="w-2.5 h-2.5 shrink-0" />
        {meta.shortLabel}
      </span>
    );
  }

  // md
  return (
    <span
      title={meta.description}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium whitespace-nowrap",
        meta.bgColor,
        meta.borderColor,
        meta.color,
        className,
      )}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {label}
    </span>
  );
}
