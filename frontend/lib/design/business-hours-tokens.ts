import { cn } from "@/lib/utils";

/**
 * Business hours + inline day-editor layout recipes.
 * Visual values come from globals.css `--business-hours-*` tokens.
 *
 * Hit-and-trial (token names only):
 *   Editor accent bar     → --business-hours-editor-accent-width
 *   Card internal gap     → --business-hours-editor-panel-gap
 *   Shift row gap         → --business-hours-shift-row-gap
 *   Time field height     → --business-hours-time-input-height
 *   Delete button size    → --business-hours-delete-button-size
 */

/** Compact week navigator — same chrome as calendar toolbar, smaller box (Figma ~30px). */
export const BUSINESS_HOURS_NAV_GROUP_CLASS =
  "flex shrink-0 items-center gap-[var(--spacing-2)]";

export const BUSINESS_HOURS_NAV_BUTTON_CLASS = cn(
  "relative box-border inline-flex shrink-0 cursor-pointer items-center justify-center p-0",
  "h-[var(--control-height-sm)] min-h-[var(--control-height-sm)] w-[var(--control-height-sm)]",
  "rounded-[var(--radius-xs)]",
  "border border-violet-primary-normal bg-white text-violet-primary-normal shadow-none",
  "after:absolute after:-inset-x-2 after:-inset-y-0.5 after:content-['']",
  "hover:bg-violet-primary-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/30",
);

export const BUSINESS_HOURS_RANGE_LABEL_CLASS = cn(
  "min-w-0 truncate text-sm font-semibold leading-5 text-black-secondary-normal",
);

/** Collapsed day row — Figma 57px hug height, 16px padding, bottom border. */
export const BUSINESS_HOURS_DAY_ROW_CLASS = cn(
  "grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] items-center gap-[var(--spacing-4)]",
  "px-[var(--spacing-4)] py-[var(--spacing-4)]",
  "border-b border-border/60",
);

export const BUSINESS_HOURS_DAY_LABEL_CLASS =
  "shrink-0 text-sm font-semibold text-foreground";

export const BUSINESS_HOURS_DAY_STATUS_CLASS =
  "min-w-0 flex-1 text-center text-sm text-foreground";

export const BUSINESS_HOURS_WARNING_CLASS =
  "inline-flex items-center gap-1 text-sm font-medium text-warning";

/** Expanded editor outer shell — lavender surface + left accent. */
export const BUSINESS_HOURS_EDITOR_SHELL_CLASS = cn(
  "border-b border-border/60 bg-violet-primary-surface",
  "border-l-[length:var(--business-hours-editor-accent-width)] border-l-violet-primary-normal",
);

export const BUSINESS_HOURS_EDITOR_HEADER_CLASS = cn(
  "flex items-center justify-between gap-[var(--spacing-2)]",
  "px-[var(--spacing-4)] py-[var(--spacing-3)]",
);

export const BUSINESS_HOURS_EDITOR_PANEL_CLASS = cn(
  "mx-[var(--spacing-4)] mb-[var(--spacing-4)] flex flex-col gap-[var(--business-hours-editor-panel-gap)]",
  "rounded-[var(--radius-md)] border border-border/60 bg-card p-[var(--spacing-4)]",
);

/** Figma shift row — delete on the left, Date + Time fields on the right. */
export const BUSINESS_HOURS_SHIFT_ROW_CLASS = cn(
  "flex w-full min-w-0 flex-wrap items-end gap-[var(--business-hours-shift-row-gap)]",
);

export const BUSINESS_HOURS_SHIFT_FIELD_CLASS =
  "min-w-[140px] flex-1 space-y-[var(--spacing-2)]";

export const BUSINESS_HOURS_DELETE_BUTTON_CLASS = cn(
  "inline-flex size-[var(--business-hours-delete-button-size)] shrink-0 cursor-pointer items-center justify-center",
  "rounded-[var(--radius-sm)] text-violet-primary-normal",
  "hover:bg-violet-primary-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/30",
  "disabled:pointer-events-none disabled:opacity-50",
);

export const BUSINESS_HOURS_TODAY_CHIP_CLASS = cn(
  "rounded-[var(--radius-xs)] bg-violet-primary-light px-1.5 py-0.5",
  "text-[10px] font-semibold uppercase tracking-wide text-violet-primary-normal",
);

/** Time input — Figma Date/Time fields. */
export const BUSINESS_HOURS_TIME_INPUT_CLASS = cn(
  "h-[var(--business-hours-time-input-height)] min-h-[var(--business-hours-time-input-height)] w-full min-w-0",
  "rounded-[var(--radius-sm)] border border-border bg-background pl-9 text-sm",
);
