/**
 * Shared Settings form layout recipes.
 * Visual values come from globals.css tokens; this file is class composition only.
 *
 * Field surfaces, description color, and discard button chrome are driven by
 * `.settings-form-surface` rules in globals.css (overrides `.glass-control`).
 *
 * Hit-and-trial density (token names only):
 *   Shell padding     → --settings-content-padding-x, --settings-content-padding-y
 *   Shell block gap   → --spacing-6 (via SETTINGS_CONTENT_SHELL_CLASS)
 *   Subsection gap    → --settings-form-section-gap
 *   Violet subheading → --settings-form-description-size, --settings-form-description-line-height
 *   Field grid gap    → --spacing-4 (SETTINGS_FORM_GRID_CLASS)
 *   Field stack gap   → --spacing-4 (SETTINGS_FORM_STACK_CLASS)
 *   Label → control   → --spacing-2 (SETTINGS_FORM_FIELDS_CLASS)
 *   Control height    → --control-height (Input / Select / Button size="default")
 */

import { cn } from "@/lib/utils";

/** Hooks globals.css settings-form overrides (white fields, violet description). */
export const SETTINGS_FORM_SURFACE_CLASS = "settings-form-surface";

/** Workspace content column gutter around a settings form shell. */
export const SETTINGS_PAGE_OUTER_CLASS = cn(
  "flex min-h-0 min-w-0 flex-col p-[var(--spacing-4)] lg:p-[var(--spacing-6)]",
  SETTINGS_FORM_SURFACE_CLASS,
);

/** Vertical page wrapper for a single settings form screen. */
export const SETTINGS_PAGE_LAYOUT_CLASS =
  "flex w-full min-w-0 flex-col";

/** White settings form card — Figma container density via existing tokens. */
export const SETTINGS_CONTENT_SHELL_CLASS = cn(
  "flex w-full min-w-0 flex-col gap-[var(--spacing-6)] rounded-[var(--radius-control)] bg-card px-[var(--settings-content-padding-x)] py-[var(--settings-content-padding-y)] shadow-elevation-xs",
  SETTINGS_FORM_SURFACE_CLASS,
);

/** Title + description block at the top of a settings form. */
export const SETTINGS_FORM_SECTION_HEADER_CLASS =
  "min-w-0 space-y-[var(--spacing-2)]";

/** Figma subheading — styled by `.settings-form-surface .settings-form-description`. */
export const SETTINGS_FORM_DESCRIPTION_CLASS =
  "settings-form-description max-w-2xl";

/** Discard CTA — styled by `button.settings-form-discard-button` in globals.css. */
export const SETTINGS_FORM_DISCARD_BUTTON_CLASS = "settings-form-discard-button";

/** Settings form action row — Figma 8px button gap. */
export const SETTINGS_FORM_ACTIONS_CLASS =
  "flex flex-wrap items-center justify-end gap-[var(--spacing-2)]";
  

/** Vertical gap between subsections inside a settings form body. */
export const SETTINGS_FORM_SECTION_STACK_CLASS =
  "flex w-full min-w-0 flex-col gap-[var(--settings-form-section-gap)]";

/** Two-column field grid — stacks on the existing `sm` breakpoint. */
export const SETTINGS_FORM_GRID_CLASS =
  "grid grid-cols-1 items-start gap-x-[var(--spacing-4)] gap-y-[var(--spacing-4)] sm:grid-cols-2";

/** Vertical stack for settings form sections and actions. */
export const SETTINGS_FORM_STACK_CLASS =
  "flex w-full min-w-0 flex-col gap-[var(--spacing-4)]";

/**
 * Label-to-control gap for shared FormItem fields.
 * Includes settings-form-surface so grids/stacks outside the content shell still match.
 */
export const SETTINGS_FORM_FIELDS_CLASS = cn(
  "[&_[data-slot=form-item]]:gap-[var(--spacing-2)]",
  SETTINGS_FORM_SURFACE_CLASS,
);

/** Full-width cell inside SettingsFormGrid. */
export const SETTINGS_FORM_GRID_SPAN_CLASS = "sm:col-span-2";
