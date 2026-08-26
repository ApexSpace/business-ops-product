/**
 * Shared Settings form layout recipes.
 * Visual values come from globals.css tokens; this file is class composition only.
 */

/** Two-column field grid — stacks on the existing `sm` breakpoint. */
export const SETTINGS_FORM_GRID_CLASS =
  "grid grid-cols-1 items-start gap-x-[var(--spacing-4)] gap-y-[var(--spacing-4)] sm:grid-cols-2";

/** Vertical stack for settings form sections and actions. */
export const SETTINGS_FORM_STACK_CLASS =
  "flex w-full min-w-0 flex-col gap-[var(--spacing-4)]";

/**
 * Label-to-control gap for shared FormItem fields.
 * Applied on a parent so TextField / SelectField stay unchanged globally.
 */
export const SETTINGS_FORM_FIELDS_CLASS =
  "[&_[data-slot=form-item]]:gap-[var(--spacing-2)]";

/** Full-width cell inside SettingsFormGrid. */
export const SETTINGS_FORM_GRID_SPAN_CLASS = "sm:col-span-2";
