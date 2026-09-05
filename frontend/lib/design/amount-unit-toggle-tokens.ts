/**
 * Amount unit toggle ($ / %) — Figma settings Toggle (82×44, radius/md).
 * Visual values from globals.css; this file is class composition only.
 */

export const AMOUNT_UNIT_TOGGLE_CLASS =
  "inline-flex h-[var(--amount-unit-toggle-height)] w-[var(--amount-unit-toggle-width)] shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-violet-primary-normal bg-white";

export const AMOUNT_UNIT_TOGGLE_SEGMENT_CLASS =
  "inline-flex h-full w-[var(--amount-unit-toggle-segment-width)] shrink-0 cursor-pointer items-center justify-center px-[var(--spacing-4)] py-[var(--spacing-2)] text-[15px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/30 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50";

export const AMOUNT_UNIT_TOGGLE_SEGMENT_ACTIVE_CLASS =
  "bg-violet-primary-normal text-white";

export const AMOUNT_UNIT_TOGGLE_SEGMENT_IDLE_CLASS =
  "bg-white text-violet-primary-normal hover:bg-violet-primary-surface";
