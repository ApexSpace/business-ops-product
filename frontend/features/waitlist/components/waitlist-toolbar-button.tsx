"use client";

import { useWaitlistSummary } from "@/features/waitlist/hooks/use-waitlist-summary";
import { cn } from "@/lib/utils";

interface WaitlistToolbarButtonProps {
  onClick: () => void;
  className?: string;
}

/**
 * Figma calendar Waitlist — Primary / Large:
 * 137×48, radius/sm, px spacing/6, primary/500 fill, white label.
 * Anchored bottom-right of the calendar grid (not the top toolbar).
 */
export function WaitlistToolbarButton({
  onClick,
  className,
}: WaitlistToolbarButtonProps) {
  const { data: summary } = useWaitlistSummary();
  const matchedCount = summary?.matchedCount ?? 0;
  const waitingCount = summary?.waitingCount ?? 0;
  const totalCount = matchedCount + waitingCount;
  const badgeLabel = matchedCount > 0 ? matchedCount : totalCount;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Waitlist${matchedCount ? `, ${matchedCount} with openings` : ""}`}
      className={cn(
        "box-border inline-flex h-12 w-[137px] shrink-0 items-center justify-center gap-2",
        "rounded-[var(--radius-sm)] border border-[#7E3BED] bg-[#7E3BED]",
        "px-[var(--spacing-6)] text-[14px] font-bold leading-none text-white shadow-none",
        "hover:border-[#7135D5] hover:bg-[#7135D5]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7E3BED]/40",
        className,
      )}
    >
      <span>Waitlist</span>
      {totalCount > 0 ? (
        <span
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
            matchedCount > 0
              ? "bg-emerald-600 text-white"
              : "bg-white/20 text-white",
          )}
        >
          {badgeLabel}
        </span>
      ) : null}
    </button>
  );
}
