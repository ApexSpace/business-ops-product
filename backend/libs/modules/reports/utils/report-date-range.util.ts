import { DateTime } from 'luxon';
import type { ReportFilters } from '../contracts/report-document';

/** Built-in rolling presets. Named months use `month:YYYY-MM`. */
export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'last_6_months'
  | 'custom'
  | string;

export type ResolvedDateRange = {
  start: Date;
  end: Date;
  preset: DateRangePreset;
  periodLabel: string;
  spanDays: number;
};

const MONTH_PRESET_RE = /^month:(\d{4})-(\d{2})$/;

function parsePreset(value: unknown): DateRangePreset {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return 'today';
}

export function resolveReportDateRange(
  filters: ReportFilters,
  timezone: string,
): ResolvedDateRange {
  const tz = timezone || 'UTC';
  const now = DateTime.now().setZone(tz);
  const preset = parsePreset(filters.dateRange ?? filters.preset ?? 'today');

  let start: DateTime;
  let end: DateTime;

  const monthMatch =
    typeof preset === 'string' ? preset.match(MONTH_PRESET_RE) : null;

  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    const monthStart = DateTime.fromObject(
      { year, month, day: 1 },
      { zone: tz },
    );
    start = monthStart.startOf('month');
    end = monthStart.endOf('month');
  } else {
    switch (preset) {
      case 'yesterday':
        start = now.minus({ days: 1 }).startOf('day');
        end = now.minus({ days: 1 }).endOf('day');
        break;
      case 'last_7_days':
        start = now.minus({ days: 6 }).startOf('day');
        end = now.endOf('day');
        break;
      case 'last_30_days':
        start = now.minus({ days: 29 }).startOf('day');
        end = now.endOf('day');
        break;
      case 'this_month':
        start = now.startOf('month');
        end = now.endOf('day');
        break;
      case 'last_month': {
        const last = now.minus({ months: 1 });
        start = last.startOf('month');
        end = last.endOf('month');
        break;
      }
      case 'last_6_months':
        start = now.minus({ months: 5 }).startOf('month');
        end = now.endOf('day');
        break;
      case 'custom': {
        const from =
          typeof filters.fromDate === 'string' ? filters.fromDate : null;
        const to = typeof filters.toDate === 'string' ? filters.toDate : null;
        start = from
          ? DateTime.fromISO(from, { zone: tz }).startOf('day')
          : now.startOf('day');
        end = to
          ? DateTime.fromISO(to, { zone: tz }).endOf('day')
          : now.endOf('day');
        break;
      }
      case 'today':
      default:
        start = now.startOf('day');
        end = now.endOf('day');
        break;
    }
  }

  // Guard inverted custom ranges — treat as a single day at the earlier date.
  if (end < start) {
    end = start.endOf('day');
  }

  const startUtc = start.toUTC().toJSDate();
  const endUtc = end.toUTC().toJSDate();
  const spanDays = Math.max(
    1,
    Math.ceil(end.diff(start, 'days').days) || 1,
  );

  return {
    start: startUtc,
    end: endUtc,
    preset,
    periodLabel: formatPeriodLabel(start, end),
    spanDays,
  };
}

function formatPeriodLabel(start: DateTime, end: DateTime): string {
  const sameDay = start.hasSame(end, 'day');
  if (sameDay) {
    return start.toFormat('MMMM d, yyyy');
  }
  if (start.hasSame(end, 'month') && start.hasSame(end, 'year')) {
    // Full calendar month → "July 2026"
    if (
      start.day === 1 &&
      end.day === end.endOf('month').day
    ) {
      return start.toFormat('MMMM yyyy');
    }
  }
  if (start.hasSame(end, 'year')) {
    return `${start.toFormat('MMM d')} – ${end.toFormat('MMM d, yyyy')}`;
  }
  return `${start.toFormat('MMM d, yyyy')} – ${end.toFormat('MMM d, yyyy')}`;
}

export function moneyNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toNumber' in value &&
    typeof (value as { toNumber: () => number }).toNumber === 'function'
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value) || 0;
}

export function formatMoney(value: number): string {
  return value.toFixed(2);
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

export function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}
