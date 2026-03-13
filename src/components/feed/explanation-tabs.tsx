"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Style = "tweetShort" | "retailPlain" | "traderPro";

interface ExplanationTabsProps {
  explanations: {
    tweetShort: string;
    retailPlain: string;
    traderPro: string;
  };
  defaultStyle?: Style;
  className?: string;
}

const TABS: { id: Style; label: string; hint: string }[] = [
  { id: "tweetShort",  label: "Tweet",  hint: "Quick share-ready summary" },
  { id: "retailPlain", label: "Plain",  hint: "Simple English explanation" },
  { id: "traderPro",   label: "Pro",    hint: "Technical breakdown" },
];

export function ExplanationTabs({ explanations, defaultStyle = "retailPlain", className }: ExplanationTabsProps) {
  const [active, setActive] = useState<Style>(defaultStyle);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Tab row */}
      <div className="flex items-center gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.hint}
            onClick={() => setActive(t.id)}
            className={cn(
              "px-2 py-0.5 rounded text-[11px] font-medium transition-all border",
              active === t.id
                ? "bg-zinc-700 text-white border-zinc-500"
                : "bg-transparent text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Explanation text */}
      <p
        className={cn(
          "leading-relaxed text-zinc-300",
          active === "tweetShort"  && "text-[13px] font-medium",
          active === "retailPlain" && "text-[13px]",
          active === "traderPro"   && "text-[12px] font-mono text-zinc-400",
        )}
      >
        {explanations[active]}
      </p>
    </div>
  );
}
