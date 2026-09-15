/**
 * Shared Automated Messages (Appointment Booked / Canceled / …) layout recipes.
 * Visual values come from globals.css tokens; this file is class composition only.
 *
 * Hit-and-trial width (token names only):
 *   Content column → --automated-message-content-max-width
 *   Message card   → --automated-message-card-max-width
 */

import { cn } from "@/lib/utils";

/** Timeline marker — Figma 32px primary circle. */
export const AUTOMATED_MESSAGE_TIMELINE_DOT_CLASS =
  "mt-1 size-8 shrink-0 rounded-full bg-violet-primary-normal";

/** Vertical connector under the timeline marker. */
export const AUTOMATED_MESSAGE_TIMELINE_LINE_CLASS =
  "mt-[var(--spacing-2)] w-px flex-1 bg-border";

/**
 * Trigger timing banner — Figma primary/50 surface, control radius, soft elevation.
 * Padding maps to settings content density tokens.
 */
export const AUTOMATED_MESSAGE_TRIGGER_BANNER_CLASS = cn(
  "flex w-full max-w-[var(--automated-message-content-max-width)] items-center justify-between gap-[var(--spacing-3)]",
  "rounded-[var(--radius-control)] bg-violet-primary-surface",
  "px-[var(--settings-content-padding-y)] py-[var(--spacing-4)]",
  "shadow-elevation-xs",
);

export const AUTOMATED_MESSAGE_TRIGGER_BANNER_LABEL_CLASS =
  "text-sm font-semibold text-violet-primary-normal";

/**
 * Configured message row — bordered surface; actions split (gear inside, more outside).
 * Width is capped by `--automated-message-card-max-width` (hit-and-trial in globals.css).
 */
export const AUTOMATED_MESSAGE_CARD_CLASS = cn(
  "flex w-full min-w-0 max-w-[var(--automated-message-card-max-width)] items-center gap-[var(--spacing-3)]",
  "rounded-[var(--radius-sm)] border border-border bg-card",
  "px-[var(--spacing-4)] py-[var(--spacing-3)]",
);

export const AUTOMATED_MESSAGE_CARD_ROW_CLASS =
  "flex w-full min-w-0 max-w-[var(--automated-message-content-max-width)] items-center gap-[var(--spacing-2)]";

/** Section body under a trigger (status radios, send scopes, message lists). */
export const AUTOMATED_MESSAGE_SECTION_STACK_CLASS = cn(
  "flex w-full min-w-0 max-w-[var(--automated-message-content-max-width)] flex-col",
  "gap-[var(--settings-form-section-gap)]",
);
