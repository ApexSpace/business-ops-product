/**
 * Shared border classes for calendar grids — slightly stronger than default
 * `border-border/30` so day columns and time slots read clearly.
 */
export const CALENDAR_GRID = {
  /** Card wrapper around each view */
  card: "border border-border",
  headerRow: "border-b border-border/75",
  footer: "border-t border-border/75",
  /** Vertical separators between days / gutter */
  column: "border-l border-border/70",
  timeGutter: "border-r border-border/70",
  /** Horizontal sub-hour (15/30/45 min) time-slot lines — subtle */
  slot: "border-b border-border/35",
  /** Stronger divider at each full-hour boundary */
  slotHour: "border-b border-border/80",
  /** Month view day cells */
  monthCell: "border-b border-r border-border/60",
} as const;
