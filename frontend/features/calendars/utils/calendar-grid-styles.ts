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
   * Time gutter — Figma 80px; sticky on horizontal scroll.
   * Hour separators only (no 15-min grid through labels).
   */
  timeGutter:
    "sticky left-0 z-20 w-20 shrink-0 border-r border-[color:rgba(126,59,237,0.6)] bg-white p-0",
  /** Horizontal sub-hour (15/30/45 min) lines — staff/day columns only */
  slot: "border-b border-[#BC9BF6]",
  /** Stronger divider at each full-hour boundary */
  slotHour: "border-b border-[color:rgba(126,59,237,0.6)]",
  /** Month view day cells */
  monthCell: "border-b border-r border-[#BC9BF6]",
  /** Staff header cell — Figma 64px, px 16, space-between */
  staffHeaderCell:
    "flex h-16 min-w-0 items-center justify-between gap-2 border-b border-[color:rgba(126,59,237,0.6)] bg-white px-4",
  /**
   * Week-view day/date column header (WED + 26).
   * Height/padding from --cs-calendar-day-header-*; weight is font-bold (700).
   */
  dayHeaderCell:
    "flex h-[var(--cs-calendar-day-header-height)] min-w-0 flex-col items-center justify-center gap-0.5 bg-white px-2 py-[var(--cs-calendar-day-header-padding-y)]",
  /** Single-day header — same type + height, row layout */
  dayHeaderCellRow:
    "flex h-[var(--cs-calendar-day-header-height)] min-w-0 items-center justify-center gap-2 bg-white px-3 py-[var(--cs-calendar-day-header-padding-y)] sm:justify-start",
  dayHeaderWeekday:
    "block min-w-0 max-w-full truncate text-[10px] font-bold uppercase leading-none tracking-wide text-grey-tertiary-normal",
  dayHeaderDate:
    "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold leading-none text-black-secondary-normal",
  dayHeaderDateToday: "bg-violet-primary-normal text-white",
  /** Month weekday labels (Sun–Sat) — same weight + vertical padding as day/date headers */
  dayHeaderWeekdayCell:
    "flex items-center justify-center px-2 py-[var(--cs-calendar-day-header-padding-y)] text-center",
  /** Empty time-gutter corner — same height as day headers */
  dayHeaderCorner:
    "sticky left-0 z-40 shrink-0 border-b border-r border-[color:rgba(126,59,237,0.6)] bg-white h-[var(--cs-calendar-day-header-height)]",
} as const;
