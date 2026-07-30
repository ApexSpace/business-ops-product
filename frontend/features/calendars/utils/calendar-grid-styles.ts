/**
 * Shared border classes for calendar grids — PandaCue Figma Calendar Table.
 * Hour / row lines: border-width 1px 0; color #BC9BF6 (primary-300).
 */
export const CALENDAR_GRID = {
  /** Outer calendar table wrapper */
  card: "border border-[#BC9BF6] bg-white",
  headerRow: "border-b border-[#BC9BF6] bg-[#F6F1FE]",
  footer: "border-t border-[#BC9BF6]",
  /** Vertical separators between staff / day columns */
  column: "border-l border-[#BC9BF6]",
  /** Time gutter — no side padding; top/bottom borders only on hour cells */
  timeGutter:
    "w-20 shrink-0 border-r border-[#BC9BF6] bg-[#F6F1FE] p-0",
  /** Horizontal sub-hour (15/30/45 min) lines — softer primary-300 */
  slot: "border-b border-[#BC9BF6]/35",
  /** Stronger divider at each full-hour boundary */
  slotHour: "border-b border-[#BC9BF6]",
  /** Month view day cells */
  monthCell: "border-b border-r border-[#BC9BF6]/60",
} as const;
