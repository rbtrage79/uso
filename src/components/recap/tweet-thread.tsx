"use client";

import { useState } from "react";
import { Heart, Repeat2, Copy, Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils/formatting";
import type { TweetPost } from "@/types/features";

interface TweetThreadProps {
  posts: TweetPost[];
}

/** Highlights $TICKER and #Hashtag segments in tweet text */
function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/(\$[A-Z]{1,5}|#\w+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^\$[A-Z]{1,5}$/.test(part)) {
          return (
            <span key={i} className="text-sky-400 font-medium">
              {part}
            </span>
          );
        }
        if (/^#\w+$/.test(part)) {
          return (
            <span key={i} className="text-sky-500/80">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function fmtCount(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export function TweetThread({ posts }: TweetThreadProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = posts.map((p) => p.body).join("\n\n---\n\n");
    navigator.clipboard.writeText(text).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-0">
      {/* Profile header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-signal-cyan/20 border border-signal-cyan/30 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-signal-cyan" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Unusual Flow Radar</p>
            <p className="text-xs text-zinc-500">@UnusualFlowRadar · Daily Recap Thread</p>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
            copied
              ? "bg-bull/15 border-bull/30 text-bull"
              : "bg-surface-muted border-surface-border text-zinc-400 hover:text-zinc-200",
          )}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy Thread"}
        </button>
      </div>

      {/* Tweets */}
      <div className="relative">
        {posts.map((post, i) => {
          const isLast = i === posts.length - 1;
          return (
            <div key={post.index} className="flex gap-3">
              {/* Thread line + avatar */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-surface-muted border border-surface-border flex items-center justify-center text-xs font-bold text-zinc-400">
                  {post.index}
                </div>
                {!isLast && (
                  <div className="w-0.5 flex-1 bg-surface-border mt-1 mb-0" style={{ minHeight: 24 }} />
                )}
              </div>

              {/* Tweet content */}
              <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
                <div className="rounded-xl border border-surface-border bg-surface-raised px-4 py-3 space-y-2">
                  {/* Body */}
                  <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
                    <HighlightedText text={post.body} />
                  </p>

                  {/* Timestamp + reactions */}
                  <div className="flex items-center justify-between pt-1 border-t border-surface-border/50">
                    <span className="text-[11px] text-zinc-600">{post.timestamp}</span>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-600">
                      <span className="flex items-center gap-1 hover:text-rose-400 cursor-default transition-colors">
                        <Heart className="w-3.5 h-3.5" />
                        {fmtCount(post.likes)}
                      </span>
                      <span className="flex items-center gap-1 hover:text-bull cursor-default transition-colors">
                        <Repeat2 className="w-3.5 h-3.5" />
                        {fmtCount(post.reposts)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
