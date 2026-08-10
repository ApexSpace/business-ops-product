/**
 * Shared border / surface classes for calendar grids — PandaCue Figma Calendar Table.
 *
 * Borders:
 * - primary soft  rgba(126,59,237,0.6)  — column / hour edges
 * - slot line     #BC9BF6               — 15-min sub-lines (staff columns only)
 * - no outer box around the calendar table
 */
export const CALENDAR_GRID = {
  /** Outer calendar table wrapper — open layout, no frame border */
  card: "overflow-hidden border-0 bg-white shadow-none",
  /** Staff / day header strip — white, bottom edge soft primary */
  headerRow: "border-b border-[color:rgba(126,59,237,0.6)] bg-white",
  footer: "border-t border-[#BC9BF6]",
  /** Vertical separators between staff / day columns */
  column: "border-l border-[color:rgba(126,59,237,0.6)]",
  /**
   * Time gutter — Figma 80px.
   * Hour separators only (no 15-min grid through labels).
   */
  timeGutter:
    "relative z-[1] w-20 shrink-0 border-r border-[color:rgba(126,59,237,0.6)] bg-white p-0",
  /** Horizontal sub-hour (15/30/45 min) lines — staff/day columns only */
  slot: "border-b border-[#BC9BF6]",
  /** Stronger divider at each full-hour boundary */
  slotHour: "border-b border-[color:rgba(126,59,237,0.6)]",
  /** Month view day cells */
  monthCell: "border-b border-r border-[#BC9BF6]",
  /** Staff header cell — Figma 64px, px 16, space-between */
  staffHeaderCell:
    "flex h-16 min-w-0 items-center justify-between gap-2 border-b border-[color:rgba(126,59,237,0.6)] bg-white px-4",
} as const;
