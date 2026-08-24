import { cn } from "@/lib/utils";

/**
 * Calendar page chrome — full-bleed grid (no page gutters).
 * Horizontal inset lives on the toolbar only so day columns can use 100% width.
 */
export const CALENDAR_WORKSPACE_CLASS =
  "flex h-full min-h-0 flex-col bg-white gap-[var(--cs-calendar-workspace-gap)] px-[var(--cs-calendar-workspace-padding-x)] pt-[var(--cs-calendar-workspace-padding-y)]";

export const CALENDAR_WORKSPACE_MOBILE_CLASS =
  "flex h-full min-h-0 flex-col bg-white gap-0 p-0";

export const CALENDAR_TOOLBAR_BAR_CLASS =
  "shrink-0 bg-white px-[var(--cs-calendar-toolbar-padding-x)]";

/** Shared height for calendar toolbar controls — Figma 44px */
export const CALENDAR_TOOLBAR_HEIGHT_CLASS = "h-11";

export const CALENDAR_TOOLBAR_INSET_X_CLASS =
  "px-[var(--cs-calendar-toolbar-padding-x)]";

/** Avoid leading-none — it clips descenders (g, y) when paired with truncate */
export const CALENDAR_TOOLBAR_TEXT_CLASS =
  "text-body font-semibold leading-5 text-black-secondary-normal";

/**
 * Today CTA layout — fill/hover from Button `variant="brand"`.
 * Hug width, radius-md, matching violet border.
 */
export const CALENDAR_TOOLBAR_TODAY_BUTTON_CLASS = cn(
  "box-border inline-flex w-auto shrink-0 items-center justify-center",
  "rounded-[var(--radius-md)] border border-violet-primary-normal px-[var(--spacing-4)]",
);

/** Filter icon — Figma: black symbol, no fill/border (page background shows through) */
export const CALENDAR_TOOLBAR_FILTER_BUTTON_CLASS = cn(
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
  "!border-0 !bg-transparent p-0 text-black shadow-none",
  "hover:!bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/30",
);

/** @deprecated prefer FILTER / TODAY tokens */
export const CALENDAR_TOOLBAR_OUTLINE_BUTTON_CLASS = cn(
  CALENDAR_TOOLBAR_HEIGHT_CLASS,
  CALENDAR_TOOLBAR_INSET_X_CLASS,
  "shrink-0 gap-2 rounded-[var(--radius-md)] border border-violet-primary-normal bg-white text-sm font-semibold text-violet-primary-normal shadow-none",
  "hover:bg-violet-primary-surface hover:text-violet-primary-normal",
);

/**
 * ── TUNE PREV / NEXT HERE (both chevrons) ──────────────────────────
 * Visual box only. `after:` expands the tap target to ≥44px on every breakpoint.
 *
 * Try:
 *   width  — w-6 (24) · w-7 (28) · w-8 (32) · w-9 (36)
 *   height — h-9 (36) · h-10 (40) · h-11 (44, matches Today)
 */
export const CALENDAR_TOOLBAR_NAV_BUTTON_SIZE_CLASS = "h-11 w-8";

/**
 * ── TUNE PREV / NEXT CHEVRON GLYPH HERE ────────────────────────────
 * Edit these two numbers only. Both < and > use them.
 * Independent of the button box above. Values are pixels.
 * Figma default: 7.36 × 12.73
 */
export const CALENDAR_TOOLBAR_NAV_ICON_SIZE = {
  width: 7.36,
  height: 12.73,
};

/**
 * Prev / next — Figma Left Buttons sides (`weui:arrow-filled`):
 * radius/xs, 1px primary/500 border, white fill; parent gap 10.
 */
export const CALENDAR_TOOLBAR_NAV_BUTTON_CLASS = cn(
  "relative box-border inline-flex shrink-0 items-center justify-center p-0",
  CALENDAR_TOOLBAR_NAV_BUTTON_SIZE_CLASS,
  "rounded-[var(--radius-xs)]",
  "border border-violet-primary-normal bg-white text-violet-primary-normal shadow-none",
  "after:absolute after:-inset-x-2 after:inset-y-0 after:content-['']",
  "hover:bg-violet-primary-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/30",
);

/** Date picker trigger — Figma Frame 15: h 44, radius/md, gap 11 */
export const CALENDAR_TOOLBAR_DATE_TRIGGER_CLASS = cn(
  "box-border inline-flex h-11 min-w-0 items-center justify-center gap-[11px]",
  "overflow-visible rounded-[var(--radius-md)] border border-violet-primary-normal bg-white px-4",
  CALENDAR_TOOLBAR_TEXT_CLASS,
  "hover:bg-violet-primary-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/30",
);

/** @deprecated kept for leftover imports */
export const CALENDAR_TOOLBAR_DATE_GROUP_CLASS =
  "flex min-w-0 items-center gap-[10px]";

export const CALENDAR_TOOLBAR_DATE_LABEL_CLASS =
  CALENDAR_TOOLBAR_DATE_TRIGGER_CLASS;

export const CALENDAR_TOOLBAR_DATE_ICON_BUTTON_CLASS =
  CALENDAR_TOOLBAR_NAV_BUTTON_CLASS;

export const CALENDAR_TOOLBAR_GHOST_BUTTON_CLASS = cn(
  CALENDAR_TOOLBAR_HEIGHT_CLASS,
  CALENDAR_TOOLBAR_INSET_X_CLASS,
  CALENDAR_TOOLBAR_TEXT_CLASS,
  "inline-flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] transition-colors hover:bg-violet-primary-surface",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/30",
);

/**
 * Day / Week — Figma joined segmented control, 44px, radius/md, no gap.
 */
export const CALENDAR_TOOLBAR_SEGMENT_GROUP_CLASS =
  "inline-flex h-11 shrink-0 items-stretch gap-0 overflow-hidden rounded-[var(--radius-md)] border border-violet-primary-normal bg-white p-0";

export const CALENDAR_TOOLBAR_SEGMENT_BUTTON_CLASS = cn(
  "inline-flex h-full min-w-[65px] items-center justify-center rounded-none px-4",
  "m-0 border-0 text-sm font-semibold transition-colors",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-primary-normal/30",
);

export const CALENDAR_TOOLBAR_SEGMENT_ACTIVE_CLASS =
  "bg-violet-primary-normal text-white hover:bg-violet-primary-normal-hover";

export const CALENDAR_TOOLBAR_SEGMENT_INACTIVE_CLASS =
  "bg-white text-violet-primary-normal hover:bg-violet-primary-surface";

/** Figma nav cluster gap between < / Today / > */
export const CALENDAR_TOOLBAR_NAV_GROUP_CLASS =
  "flex shrink-0 items-center gap-[10px]";
