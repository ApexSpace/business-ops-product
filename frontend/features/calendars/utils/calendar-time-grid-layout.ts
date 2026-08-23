import type { CSSProperties } from "react";

/**
 * Shared CSS Grid recipes for calendar time tables (gutter + N day/staff columns).
 *
 * - fluid — columns share leftover width equally (`minmax(0, 1fr)`). Use when
 *   a known column count must fit the viewport (desktop week: 7 days).
 * - fill — columns grow with leftover space but never shrink below `columnMinPx`
 *   (horizontal scroll if the viewport is narrower than gutter + N × min).
 * - fixed — exact token widths (mobile Figma columns).
 */
export type CalendarTimeGridMode = "fluid" | "fill" | "fixed";

export function calendarTimeGridLayout(options: {
  gutterPx: number;
  columnCount: number;
  columnMinPx: number;
  mode: CalendarTimeGridMode;
}): {
  gridTemplateColumns: string;
  frameStyle: CSSProperties;
} {
  const { gutterPx, columnCount, columnMinPx, mode } = options;
  const count = Math.max(columnCount, 1);

  if (mode === "fluid") {
    return {
      gridTemplateColumns: `${gutterPx}px repeat(${count}, minmax(0, 1fr))`,
      frameStyle: { width: "100%" },
    };
  }

  if (mode === "fixed") {
    return {
      gridTemplateColumns: `${gutterPx}px repeat(${count}, ${columnMinPx}px)`,
      frameStyle: { minWidth: gutterPx + count * columnMinPx },
    };
  }

  return {
    gridTemplateColumns: `${gutterPx}px repeat(${count}, minmax(${columnMinPx}px, 1fr))`,
    frameStyle: { minWidth: gutterPx + count * columnMinPx },
  };
}
