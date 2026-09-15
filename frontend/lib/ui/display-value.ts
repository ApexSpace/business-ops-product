/** Blank output for missing scalar values in tables, drawers, and detail fields. */
export const EMPTY_DISPLAY = "" as const;

const LEGACY_EMPTY_PLACEHOLDERS = new Set(["—", "–", "-"]);

/** True when a value is null, undefined, whitespace, or a legacy dash placeholder. */
export function isEmptyDisplayValue(
  value: string | null | undefined,
): value is null | undefined | "" {
  if (value == null) return true;
  const trimmed = value.trim();
  return trimmed.length === 0 || LEGACY_EMPTY_PLACEHOLDERS.has(trimmed);
}

/** Trim string values; return blank when missing or a legacy dash placeholder. */
export function displayValue(value: string | null | undefined): string {
  if (isEmptyDisplayValue(value)) return EMPTY_DISPLAY;
  return value.trim();
}

/** First non-empty display value, else blank. */
export function displayValueCoalesce(
  ...values: Array<string | null | undefined>
): string {
  for (const value of values) {
    const next = displayValue(value);
    if (next) return next;
  }
  return EMPTY_DISPLAY;
}
