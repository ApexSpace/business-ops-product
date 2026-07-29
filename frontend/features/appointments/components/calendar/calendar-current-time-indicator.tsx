"use client";

import { cn } from "@/lib/utils";

interface CalendarCurrentTimeIndicatorProps {
  topPx: number;
  className?: string;
}

export function CalendarCurrentTimeIndicator({
  topPx,
  className,
}: CalendarCurrentTimeIndicatorProps) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-x-0 z-10", className)}
      style={{ top: topPx }}
      aria-hidden
    >
      <div className="relative flex items-center">
        <div className="flex w-14 shrink-0 justify-end pr-1.5">
          <span className="size-2.5 rounded-full bg-destructive shadow-[0_0_0_2px] shadow-destructive/20" />
        </div>
        <div className="h-[2px] flex-1 rounded-full bg-destructive/75" />
      </div>
    </div>
  );
}
