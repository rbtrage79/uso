import { getTagStyle } from "@/lib/feed/tag-generator";
import { cn } from "@/lib/utils";

interface TagPillProps {
  tag: string;
  onClick?: (tag: string) => void;
  active?: boolean;
  size?: "xs" | "sm";
}

export function TagPill({ tag, onClick, active, size = "xs" }: TagPillProps) {
  const colorCls = getTagStyle(tag);
  const sizeCls  = size === "xs"
    ? "px-1.5 py-0.5 text-[10px] leading-none"
    : "px-2 py-1 text-xs";

  return (
    <button
      type="button"
      onClick={() => onClick?.(tag)}
      className={cn(
        "inline-flex items-center rounded border font-medium tracking-tight transition-opacity",
        sizeCls,
        colorCls,
        onClick ? "cursor-pointer hover:opacity-80" : "cursor-default",
        active && "ring-1 ring-white/30",
      )}
    >
      {tag}
    </button>
  );
}

interface TagListProps {
  tags: string[];
  max?: number;
  onTagClick?: (tag: string) => void;
  activeTag?: string;
  size?: "xs" | "sm";
}

export function TagList({ tags, max = 8, onTagClick, activeTag, size = "xs" }: TagListProps) {
  const visible = tags.slice(0, max);
  const overflow = tags.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag) => (
        <TagPill
          key={tag}
          tag={tag}
          onClick={onTagClick}
          active={tag === activeTag}
          size={size}
        />
      ))}
      {overflow > 0 && (
        <span className="px-1.5 py-0.5 text-[10px] leading-none text-zinc-500 border border-zinc-800 rounded">
          +{overflow}
        </span>
      )}
    </div>
  );
}
