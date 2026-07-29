/**
 * Shared report date-range dropdown options (Mangomint-style).
 * Used by every report that has a `date_range` filter.
 */

export type ReportDateRangeOption = {
  value: string;
  label: string;
};

const MONTH_COUNT = 13; // current month through same month last year

function formatShortDay(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatRangeLabel(start: Date, end: Date): string {
  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  ) {
    return formatShortDay(start);
  }
  return `${formatShortDay(start)} - ${formatShortDay(end)}`;
}

/** `month:2026-07` — calendar month preset understood by the backend. */
export function monthPresetValue(year: number, monthIndex0: number): string {
  const month = String(monthIndex0 + 1).padStart(2, "0");
  return `month:${year}-${month}`;
}

export function isMonthPreset(value: string): boolean {
  return /^month:\d{4}-\d{2}$/.test(value);
}

export function isCustomDateRange(value: string): boolean {
  return value === "custom";
}

/** Named months from the current month back one year (13 entries). */
export function buildReportMonthOptions(
  nowInput: Date = new Date(),
): ReportDateRangeOption[] {
  const now = startOfLocalDay(nowInput);
  const options: ReportDateRangeOption[] = [];
  for (let i = 0; i < MONTH_COUNT; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: monthPresetValue(monthDate.getFullYear(), monthDate.getMonth()),
      label: formatMonthYear(monthDate),
    });
  }
  return options;
}

/** Default month preset for Client Retention (previous calendar month). */
export function defaultRetentionMonthPreset(
  nowInput: Date = new Date(),
): string {
  const now = startOfLocalDay(nowInput);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return monthPresetValue(prev.getFullYear(), prev.getMonth());
}

/**
 * Human-readable bounds for the selected period (used by the initial-client note).
 */
export function describeReportDateRangeBounds(
  preset: string,
  fromDate?: string,
  toDate?: string,
): { start: Date; end: Date; label: string } | null {
  const formatLong = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  if (isMonthPreset(preset)) {
    const match = /^month:(\d{4})-(\d{2})$/.exec(preset);
    if (!match) return null;
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    return {
      start,
      end,
      label: `${formatLong(start)} – ${formatLong(end)}`,
    };
  }

  if (isCustomDateRange(preset)) {
    if (!fromDate || !toDate) return null;
    const start = new Date(`${fromDate}T00:00:00`);
    const end = new Date(`${toDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }
    return {
      start,
      end,
      label: `${formatLong(start)} – ${formatLong(end)}`,
    };
  }

  return null;
}

/**
 * Build the reusable date-range options list.
 * `full` = rolling presets + named months; `months` = named months + custom only.
 */
export function buildReportDateRangeOptions(
  nowInput: Date = new Date(),
  mode: "full" | "months" = "full",
): ReportDateRangeOption[] {
  const now = startOfLocalDay(nowInput);

  if (mode === "months") {
    return [
      ...buildReportMonthOptions(now),
      { value: "custom", label: "Custom time period" },
    ];
  }

  const yesterday = addDays(now, -1);
  const last7Start = addDays(now, -6);
  const last30Start = addDays(now, -29);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthAnchor = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const last6Start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const options: ReportDateRangeOption[] = [
    {
      value: "today",
      label: `Today (${formatShortDay(now)})`,
    },
    {
      value: "yesterday",
      label: `Yesterday (${formatShortDay(yesterday)})`,
    },
    {
      value: "last_7_days",
      label: `Last 7 days (${formatRangeLabel(last7Start, now)})`,
    },
    {
      value: "last_30_days",
      label: `Last 30 days (${formatRangeLabel(last30Start, now)})`,
    },
    {
      value: "this_month",
      label: `This month (${formatRangeLabel(thisMonthStart, now)})`,
    },
    {
      value: "last_month",
      label: `Last month (${formatRangeLabel(lastMonthAnchor, lastMonthEnd)})`,
    },
    {
      value: "last_6_months",
      label: `Last 6 months (${formatRangeLabel(last6Start, now)})`,
    },
    {
      value: "custom",
      label: "Custom time period",
    },
  ];

  options.push(...buildReportMonthOptions(now));
  return options;
}
