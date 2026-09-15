"use client";

import { useLayoutEffect, useRef } from "react";
import { scrollTimeGridToNow } from "@/features/appointments/utils/scroll-time-grid-to-now";

/**
 * When a day/week time grid mounts or today’s range becomes visible, scroll
 * the red current-time line into view. Minute ticks do not re-scroll.
 */
export function useScrollTimeGridToNow(
  scrollRef: { readonly current: HTMLElement | null },
  options: {
    currentTimeTopPx: number | null;
    stickyHeaderHeight: number;
    enabled?: boolean;
    /** Changes when the visible date range or view identity changes. */
    resetKey: string;
  },
): void {
  const {
    currentTimeTopPx,
    stickyHeaderHeight,
    enabled = true,
    resetKey,
  } = options;
  const topPxRef = useRef(currentTimeTopPx);
  topPxRef.current = currentTimeTopPx;
  const hasNowLine = currentTimeTopPx != null;

  useLayoutEffect(() => {
    if (!enabled || !hasNowLine) return;
    const run = () => {
      const node = scrollRef.current;
      const top = topPxRef.current;
      if (!node || top == null) return;
      scrollTimeGridToNow(node, top, stickyHeaderHeight);
    };

    run();
    const frame = window.requestAnimationFrame(run);
    return () => window.cancelAnimationFrame(frame);
  }, [enabled, hasNowLine, resetKey, scrollRef, stickyHeaderHeight]);
}
