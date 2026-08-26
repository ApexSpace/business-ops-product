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

/** Horizontal inset matching default Button size. */
export const CONTROL_PADDING_X_CLASS = "px-[var(--control-padding-x)]";

/** Select triggers in filter bars and toolbars */
export const FILTER_SELECT_TRIGGER_CLASS = `${CONTROL_HEIGHT_CLASS} shrink-0 text-sm`;

/** Search fields in filter bars (width set per layout) */
export const FILTER_SEARCH_CLASS = `${CONTROL_HEIGHT_CLASS} shrink-0 text-sm`;

/**
 * Trailing control overlay (plus, chevron, clear).
 * `inset-y-0` + flex centers the icon in the field regardless of icon size.
 * Clickable children (plus) set `pointer-events-auto` and `cursor-pointer`.
 */
export const CONTROL_END_SLOT_CLASS =
  "pointer-events-none absolute inset-y-0 right-1.5 z-10 flex items-center justify-center";

/** Leading control overlay (search / user icon). */
export const CONTROL_START_SLOT_CLASS =
  "pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center justify-center";
