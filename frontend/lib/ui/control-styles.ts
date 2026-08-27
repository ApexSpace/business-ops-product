/**
 * Shared sizing for inputs, selects, search, filters, and toolbar controls.
 * Height / padding tokens live in globals.css (`--control-height`, `--control-padding-x`).
 * Default Button uses the same tokens — toolbar chrome should match that box, not h-11.
 */
export const CONTROL_HEIGHT_CLASS = "h-[var(--control-height)]";

/** Same as default Button `min-h` — keeps flex/grid from shrinking the control. */
export const CONTROL_MIN_HEIGHT_CLASS = "min-h-[var(--control-height)]";

export const CONTROL_HEIGHT_BOX_CLASS = `${CONTROL_HEIGHT_CLASS} ${CONTROL_MIN_HEIGHT_CLASS}`;

/** Square icon control matching default Button height. */
export const CONTROL_SIZE_CLASS =
  "size-[var(--control-height)] min-h-[var(--control-height)] min-w-[var(--control-height)]";

/**
 * Shared list/calendar filter icon button — Appointments toolbar is the source of truth.
 * Square `--control-height` box, no fill/border, black glyph, hover `black/5`.
 */
export const FILTER_ICON_BUTTON_CLASS = [
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-md)]",
  CONTROL_SIZE_CLASS,
  "!border-0 !bg-transparent p-0 text-black shadow-none",
  "after:absolute after:-inset-0.5 after:content-['']",
  "hover:!bg-black/5 hover:!text-black",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-primary-normal/30",
].join(" ");

/** Horizontal inset matching default Button size. */
export const CONTROL_PADDING_X_CLASS = "px-[var(--control-padding-x)]";

/** Select triggers in filter bars and toolbars */
export const FILTER_SELECT_TRIGGER_CLASS = `${CONTROL_HEIGHT_CLASS} shrink-0 text-sm`;

/** Search fields in filter bars (width set per layout) */
export const FILTER_SEARCH_CLASS = `${CONTROL_HEIGHT_CLASS} shrink-0 text-sm`;

/**
 * Trailing control overlay (plus, chevron, clear).
 * `--plus-button-inset` is the gap from the field’s right edge (and matches
 * top/bottom when the control is `--plus-button-size`). Does not resize the “+”.
 */
export const CONTROL_END_SLOT_CLASS =
  "pointer-events-none absolute inset-y-0 right-[var(--plus-button-inset)] z-10 flex items-center justify-center";

/** Input padding so text does not run under the trailing “+”. */
export const CONTROL_END_SLOT_INPUT_PAD_CLASS =
  "pr-[calc(var(--plus-button-size)+var(--plus-button-inset)+0.25rem)]";

/** Leading control overlay (search / user icon). */
export const CONTROL_START_SLOT_CLASS =
  "pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center justify-center";
