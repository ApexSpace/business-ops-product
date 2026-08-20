import { cn } from "@/lib/utils";

/** Shared height for calendar toolbar controls — Figma 44px */
export const CALENDAR_TOOLBAR_HEIGHT_CLASS = "h-11";

export const CALENDAR_TOOLBAR_INSET_X_CLASS = "px-4";

/** Avoid leading-none — it clips descenders (g, y) when paired with truncate */
export const CALENDAR_TOOLBAR_TEXT_CLASS =
  "text-body font-semibold leading-5 text-black-secondary-normal";

/**
 * Today CTA — Figma Left Buttons center:
 * h 44 fixed, width hug (~81), radius/md, 1px primary border,
 * fill primary/500 (#7E3BED), px spacing/4, white Medium 14/16.
 */
export const CALENDAR_TOOLBAR_TODAY_BUTTON_CLASS = cn(
  "box-border inline-flex h-11 w-auto shrink-0 items-center justify-center",
  "rounded-[var(--radius-md)] border border-[#7E3BED] bg-[#7E3BED] px-[var(--spacing-4)]",
  "text-[14px] font-bold leading-4 text-white shadow-none",
  "hover:bg-[#7135D5] hover:border-[#7135D5]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7E3BED]/40",
);

/** Filter icon — Figma: black symbol, no fill/border (page background shows through) */
export const CALENDAR_TOOLBAR_FILTER_BUTTON_CLASS = cn(
  "inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
  "!border-0 !bg-transparent p-0 text-black shadow-none",
  "hover:!bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7E3BED]/30",
);

/** @deprecated prefer FILTER / TODAY tokens */
export const CALENDAR_TOOLBAR_OUTLINE_BUTTON_CLASS = cn(
  CALENDAR_TOOLBAR_HEIGHT_CLASS,
  CALENDAR_TOOLBAR_INSET_X_CLASS,
  "shrink-0 gap-2 rounded-[var(--radius-md)] border border-[#7E3BED] bg-white text-sm font-semibold text-[#7E3BED] shadow-none",
  "hover:bg-[#F6F1FE] hover:text-[#7E3BED]",
);

/**
 * Prev / next — Figma Left Buttons sides (`weui:arrow-filled`):
 * height 44 fixed, width hug (~39.36 = spacing/4 + 7.36 + spacing/4),
 * radius/xs, py spacing/2, px spacing/4,
 * 1px primary/500 border, white fill; parent gap 10.
 */
export const CALENDAR_TOOLBAR_NAV_BUTTON_CLASS = cn(
  "box-border inline-flex h-11 w-auto shrink-0 items-center justify-center",
  "rounded-[var(--radius-xs)]",
  "border border-[#7E3BED] bg-white px-[var(--spacing-4)] py-[var(--spacing-2)] text-[#7E3BED] shadow-none",
  "hover:bg-[#F6F1FE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7E3BED]/30",
);

/** Date picker trigger — Figma Frame 15: h 44, radius/md, gap 11 */
export const CALENDAR_TOOLBAR_DATE_TRIGGER_CLASS = cn(
  "box-border inline-flex h-11 min-w-0 items-center justify-center gap-[11px]",
  "overflow-visible rounded-[var(--radius-md)] border border-[#7E3BED] bg-white px-4",
  CALENDAR_TOOLBAR_TEXT_CLASS,
  "hover:bg-[#F6F1FE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7E3BED]/30",
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
  "inline-flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] transition-colors hover:bg-[#F6F1FE]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7E3BED]/30",
);

/**
 * Day / Week — Figma joined segmented control, 44px, radius/md, no gap.
 */
export const CALENDAR_TOOLBAR_SEGMENT_GROUP_CLASS =
  "inline-flex h-11 shrink-0 items-stretch gap-0 overflow-hidden rounded-[var(--radius-md)] border border-[#7E3BED] bg-white p-0";

export const CALENDAR_TOOLBAR_SEGMENT_BUTTON_CLASS = cn(
  "inline-flex h-full min-w-[65px] items-center justify-center rounded-none px-4",
  "m-0 border-0 text-sm font-semibold transition-colors",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7E3BED]/30",
);

export const CALENDAR_TOOLBAR_SEGMENT_ACTIVE_CLASS =
  "bg-[#7E3BED] text-white hover:bg-[#7135D5]";

export const CALENDAR_TOOLBAR_SEGMENT_INACTIVE_CLASS =
  "bg-white text-[#7E3BED] hover:bg-[#F6F1FE]";

export const CALENDAR_TOOLBAR_DIVIDER_CLASS =
  "hidden h-11 w-px shrink-0 bg-[color:rgba(126,59,237,0.6)] sm:block";

/** Figma nav cluster gap between < / Today / > */
export const CALENDAR_TOOLBAR_NAV_GROUP_CLASS =
  "flex shrink-0 items-center gap-[10px]";
