/**
 * Shared sizing for inputs, selects, search, filters, and toolbar controls.
 * Height token: `--control-height` in globals.css (2.25rem).
 */
export const CONTROL_HEIGHT_CLASS = "h-[var(--control-height)]";

/** Select triggers in filter bars and toolbars */
export const FILTER_SELECT_TRIGGER_CLASS = `${CONTROL_HEIGHT_CLASS} shrink-0 text-sm`;

/** Search fields in filter bars (width set per layout) */
export const FILTER_SEARCH_CLASS = `${CONTROL_HEIGHT_CLASS} shrink-0 text-sm`;
