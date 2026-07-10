import { CONTROL_HEIGHT_CLASS } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

/** Shared height for every control in the appointments calendar toolbar. */
export const CALENDAR_TOOLBAR_HEIGHT_CLASS = CONTROL_HEIGHT_CLASS;

/** Shared horizontal inset for toolbar labels and text controls. */
export const CALENDAR_TOOLBAR_INSET_X_CLASS = "px-3";

/** Shared typography for toolbar labels. */
export const CALENDAR_TOOLBAR_TEXT_CLASS = "text-sm font-medium";

/** Bordered toolbar button (Today, Filters). */
export const CALENDAR_TOOLBAR_OUTLINE_BUTTON_CLASS = cn(
  CALENDAR_TOOLBAR_HEIGHT_CLASS,
  CALENDAR_TOOLBAR_INSET_X_CLASS,
  CALENDAR_TOOLBAR_TEXT_CLASS,
  "shrink-0 gap-2",
);

/** Borderless toolbar control (staff selector). */
export const CALENDAR_TOOLBAR_GHOST_BUTTON_CLASS = cn(
  CALENDAR_TOOLBAR_HEIGHT_CLASS,
  CALENDAR_TOOLBAR_INSET_X_CLASS,
  CALENDAR_TOOLBAR_TEXT_CLASS,
  "inline-flex min-w-0 items-center gap-2 transition-colors hover:bg-muted/55",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
);

/** Date navigation group shell. */
export const CALENDAR_TOOLBAR_DATE_GROUP_CLASS =
  "flex min-w-0 items-stretch overflow-hidden rounded-md border border-[color:var(--glass-border)] bg-white shadow-none dark:bg-card";

/** Date label / picker trigger inside the nav group. */
export const CALENDAR_TOOLBAR_DATE_LABEL_CLASS = cn(
  CALENDAR_TOOLBAR_HEIGHT_CLASS,
  CALENDAR_TOOLBAR_INSET_X_CLASS,
  CALENDAR_TOOLBAR_TEXT_CLASS,
  "inline-flex min-w-0 flex-1 items-center justify-center gap-1 border-x border-border bg-white transition-colors dark:bg-card",
  "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset dark:hover:bg-muted/40",
);

/** Icon-only control inside the date nav group. */
export const CALENDAR_TOOLBAR_DATE_ICON_BUTTON_CLASS = cn(
  CALENDAR_TOOLBAR_HEIGHT_CLASS,
  "w-[var(--control-height)] shrink-0 rounded-none border-0 bg-white px-0 shadow-none hover:bg-muted/50 dark:bg-card dark:hover:bg-muted/40",
);

/** Segmented Day / Week switcher shell. */
export const CALENDAR_TOOLBAR_SEGMENT_GROUP_CLASS = cn(
  CALENDAR_TOOLBAR_DATE_GROUP_CLASS,
  "shrink-0",
);

/** Segment button inside Day / Week switcher. */
export const CALENDAR_TOOLBAR_SEGMENT_BUTTON_CLASS = cn(
  CALENDAR_TOOLBAR_HEIGHT_CLASS,
  CALENDAR_TOOLBAR_INSET_X_CLASS,
  "inline-flex min-w-[3.25rem] items-center justify-center text-xs font-semibold transition-colors",
);

/** Vertical divider between toolbar clusters. */
export const CALENDAR_TOOLBAR_DIVIDER_CLASS =
  "hidden h-[var(--control-height)] w-px shrink-0 bg-border/70 sm:block";
