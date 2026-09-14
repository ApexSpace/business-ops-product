/**
 * Forms builder recipes. Visual values live in globals.css / theme tokens.
 * This file is class composition only — no hex, no one-off px in features.
 *
 * Hit-and-trial (token names only):
 *   Canvas card column → --forms-builder-canvas-max-width (Figma 680px)
 *   Header bar          → --forms-builder-header-height (Figma 57px)
 *   Settings sidebar    → --forms-builder-settings-width
 *   Insert control      → --forms-builder-insert-size
 *   Card padding        → --spacing-5 (Figma 20px)
 *   Card radius         → --radius-card (Figma 12px)
 *   Field preview       → --control-height + --radius (40×8)
 *   Settings field gap  → --spacing-6 (Figma 24px)
 */

import { cn } from "@/lib/utils";

export const FORMS_BUILDER_HEADER_CLASS = cn(
  "sticky top-0 z-20 flex h-[var(--forms-builder-header-height)] min-h-[var(--forms-builder-header-height)] shrink-0 items-center justify-between gap-[var(--spacing-3)]",
  "border-b border-border bg-card px-[var(--page-padding-x)]",
);

export const FORMS_BUILDER_HEADER_CLUSTER_CLASS =
  "flex min-w-0 items-center gap-[var(--spacing-3)]";

export const FORMS_BUILDER_HEADER_DIVIDER_CLASS =
  "h-5 w-px shrink-0 bg-border";

export const FORMS_BUILDER_BACK_LINK_CLASS = cn(
  "inline-flex shrink-0 items-center gap-[var(--spacing-2)] text-sm font-medium text-violet-primary-normal",
  "hover:text-violet-primary-normal-hover",
);

export const FORMS_BUILDER_SAVED_META_CLASS =
  "shrink-0 text-sm text-muted-foreground";

export const FORMS_BUILDER_HEADER_ACTIONS_CLASS =
  "flex shrink-0 items-center gap-[var(--spacing-2)]";

export const FORMS_BUILDER_SHELL_GRID_CLASS = cn(
  "grid h-full min-h-0 flex-1 overflow-hidden",
  "grid-rows-[minmax(0,1fr)_minmax(18rem,42%)] grid-cols-1",
  "lg:grid-rows-none lg:grid-cols-[minmax(0,1fr)_var(--forms-builder-settings-width)]",
);

export const FORMS_BUILDER_CANVAS_CLASS =
  "flex h-full min-h-0 flex-col overflow-hidden bg-violet-primary-surface";

export const FORMS_BUILDER_CANVAS_SCROLL_CLASS =
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[var(--spacing-6)] py-[var(--spacing-6)]";

export const FORMS_BUILDER_CANVAS_COLUMN_CLASS = cn(
  "mx-auto flex w-full max-w-[var(--forms-builder-canvas-max-width)] flex-col",
  "gap-[var(--spacing-2)]",
);

export const FORMS_BUILDER_CARD_CLASS = cn(
  "relative w-full rounded-[var(--radius-card)] bg-card p-[var(--spacing-5)]",
  "shadow-elevation-xs",
);

export const FORMS_BUILDER_CARD_IDLE_CLASS = "border border-transparent";

export const FORMS_BUILDER_CARD_SELECTED_CLASS =
  "border-2 border-violet-primary-normal";

export const FORMS_BUILDER_ACTIVE_PILL_CLASS = cn(
  "absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2",
  "inline-flex items-center gap-1 rounded-full bg-violet-primary-normal",
  "px-[var(--spacing-2)] py-0.5 text-[11px] font-medium leading-none text-white",
);

export const FORMS_BUILDER_TYPE_CHIP_CLASS = cn(
  "inline-flex max-w-full items-center gap-[var(--spacing-2)]",
  "rounded-[var(--radius-xs)] bg-violet-primary-surface",
  "px-[var(--spacing-2)] py-0.5",
  "text-[11px] font-medium leading-none text-violet-primary-normal",
);

export const FORMS_BUILDER_FIELD_LABEL_CLASS =
  "text-sm font-semibold text-violet-primary-darker";

export const FORMS_BUILDER_FIELD_PREVIEW_CLASS = cn(
  "flex h-[var(--control-height)] min-h-[var(--control-height)] w-full items-center",
  "rounded-[var(--radius)] bg-violet-primary-surface px-[var(--spacing-3)]",
  "text-sm text-muted-foreground",
);

export const FORMS_BUILDER_FIELD_HELP_CLASS =
  "text-xs text-muted-foreground";

export const FORMS_BUILDER_INSERT_BUTTON_CLASS = cn(
  "inline-flex size-[var(--forms-builder-insert-size)] shrink-0 items-center justify-center",
  "rounded-full border border-border bg-card text-muted-foreground shadow-elevation-xs",
  "hover:border-violet-primary-normal hover:text-violet-primary-normal",
);

export const FORMS_BUILDER_INSERT_ROW_CLASS =
  "flex items-center justify-center py-[var(--spacing-2)]";

export const FORMS_BUILDER_TITLE_EYEBROW_CLASS =
  "text-[11px] font-bold uppercase tracking-[0.08em] text-violet-primary-normal";

export const FORMS_BUILDER_TITLE_CLASS =
  "text-2xl font-bold tracking-tight text-violet-primary-darker";

export const FORMS_BUILDER_TITLE_DESCRIPTION_CLASS =
  "text-sm text-muted-foreground";

export const FORMS_BUILDER_SETTINGS_CLASS = cn(
  "flex h-full min-h-0 flex-col overflow-hidden border-l border-border bg-card",
);

export const FORMS_BUILDER_SETTINGS_HEADER_CLASS =
  "flex shrink-0 items-center justify-between gap-[var(--spacing-2)] border-b border-border px-[var(--spacing-4)] py-[var(--spacing-3)]";

export const FORMS_BUILDER_SETTINGS_TITLE_CLASS =
  "text-sm font-semibold text-violet-primary-darker";

export const FORMS_BUILDER_SETTINGS_TABS_CLASS =
  "h-auto w-full justify-start gap-[var(--spacing-4)] rounded-none border-b border-border bg-transparent p-0 px-[var(--spacing-4)]";

export const FORMS_BUILDER_SETTINGS_TAB_CLASS = cn(
  "h-auto flex-none rounded-none px-0 pb-[var(--spacing-2)] pt-[var(--spacing-3)]",
  "text-sm font-medium text-muted-foreground shadow-none",
  "data-active:bg-transparent data-active:text-violet-primary-normal data-active:shadow-none",
  "after:!bg-violet-primary-normal after:!bottom-0",
);

export const FORMS_BUILDER_SETTINGS_BODY_CLASS =
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-[var(--spacing-4)] py-[var(--spacing-4)]";

export const FORMS_BUILDER_SETTINGS_STACK_CLASS =
  "flex w-full min-w-0 flex-col gap-[var(--spacing-6)]";

export const FORMS_BUILDER_SETTING_LABEL_CLASS =
  "text-sm font-medium text-foreground";

export const FORMS_BUILDER_SETTING_HELPER_CLASS =
  "text-xs text-muted-foreground";

export const FORMS_BUILDER_SETTINGS_FOOTER_CLASS = cn(
  "flex shrink-0 items-center justify-end gap-[var(--spacing-2)]",
  "border-t border-border bg-card px-[var(--spacing-4)] py-[var(--spacing-3)]",
);

export const FORMS_BUILDER_EMPTY_HINT_CLASS =
  "text-sm text-muted-foreground";
