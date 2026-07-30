import { cn } from "@/lib/utils";

/** Shared height for calendar toolbar controls — Figma 44px */
export const CALENDAR_TOOLBAR_HEIGHT_CLASS = "h-11";

export const CALENDAR_TOOLBAR_INSET_X_CLASS = "px-4";

export const CALENDAR_TOOLBAR_TEXT_CLASS =
  "text-sm font-medium text-black-secondary-normal";

/** Filter / outline toolbar button — Figma purple border */
export const CALENDAR_TOOLBAR_OUTLINE_BUTTON_CLASS = cn(
  CALENDAR_TOOLBAR_HEIGHT_CLASS,
  CALENDAR_TOOLBAR_INSET_X_CLASS,
  CALENDAR_TOOLBAR_TEXT_CLASS,
  "shrink-0 gap-2 rounded-lg border border-[#7E3BED] bg-white text-[#7E3BED] shadow-none",
  "hover:bg-[#F6F1FE] hover:text-[#7E3BED]",
);

/** Prev / next square nav — Figma light purple rounded squares */
export const CALENDAR_TOOLBAR_NAV_BUTTON_CLASS = cn(
  "inline-flex size-11 shrink-0 items-center justify-center rounded-lg",
  "border-0 bg-[#F6F1FE] text-[#7E3BED] shadow-none",
  "hover:bg-[#EDE4FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7E3BED]/30",
);

/** Date picker trigger — Figma 44px, border #7E3BED */
export const CALENDAR_TOOLBAR_DATE_TRIGGER_CLASS = cn(
  CALENDAR_TOOLBAR_HEIGHT_CLASS,
  CALENDAR_TOOLBAR_INSET_X_CLASS,
  CALENDAR_TOOLBAR_TEXT_CLASS,
  "inline-flex min-w-0 items-center justify-center gap-2.5 rounded-lg border border-[#7E3BED] bg-white",
  "hover:bg-[#F6F1FE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7E3BED]/30",
);

/** @deprecated kept for any leftover imports — prefer NAV + DATE_TRIGGER */
export const CALENDAR_TOOLBAR_DATE_GROUP_CLASS =
  "flex min-w-0 items-center gap-[11px]";

export const CALENDAR_TOOLBAR_DATE_LABEL_CLASS =
  CALENDAR_TOOLBAR_DATE_TRIGGER_CLASS;

export const CALENDAR_TOOLBAR_DATE_ICON_BUTTON_CLASS =
  CALENDAR_TOOLBAR_NAV_BUTTON_CLASS;

export const CALENDAR_TOOLBAR_GHOST_BUTTON_CLASS = cn(
  CALENDAR_TOOLBAR_HEIGHT_CLASS,
  CALENDAR_TOOLBAR_INSET_X_CLASS,
  CALENDAR_TOOLBAR_TEXT_CLASS,
  "inline-flex min-w-0 items-center gap-2 rounded-lg transition-colors hover:bg-[#F6F1FE]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7E3BED]/30",
);

/** Day / Week segmented control shell */
export const CALENDAR_TOOLBAR_SEGMENT_GROUP_CLASS =
  "flex h-11 shrink-0 items-stretch overflow-hidden rounded-lg border border-[#7E3BED] bg-white";

export const CALENDAR_TOOLBAR_SEGMENT_BUTTON_CLASS = cn(
  "inline-flex min-w-[4.5rem] items-center justify-center px-4 text-sm font-semibold transition-colors",
);

export const CALENDAR_TOOLBAR_DIVIDER_CLASS =
  "hidden h-11 w-px shrink-0 bg-[#BC9BF6]/60 sm:block";
