import { DateTime } from 'luxon';
import type { OfferDateRule } from '../types/offer.types';

export function parseOfferDateRules(value: unknown): OfferDateRule[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isOfferDateRule);
}

function isOfferDateRule(value: unknown): value is OfferDateRule {
  if (!value || typeof value !== 'object') return false;
  const rule = value as OfferDateRule;
  return (
    rule.type === 'date_range' ||
    rule.type === 'recurring_days' ||
    rule.type === 'recurring_time_window'
  );
}

export function matchesOfferDateRules(
  date: Date,
  rules: OfferDateRule[],
  timezone = 'UTC',
): boolean {
  if (rules.length === 0) return false;
  const dt = DateTime.fromJSDate(date, { zone: timezone });
  return rules.some((rule) => matchesSingleRule(dt, rule));
}


function luxonWeekdayToUserDay(weekday: number): number {
  return weekday === 7 ? 0 : weekday;
}

function matchesSingleRule(dt: DateTime, rule: OfferDateRule): boolean {
  switch (rule.type) {
    case 'date_range': {
      if (!rule.startDate || !rule.endDate) return false;
      const zone = dt.zoneName ?? 'UTC';
      const start = DateTime.fromISO(rule.startDate, { zone }).startOf('day');
      const end = DateTime.fromISO(rule.endDate, { zone }).endOf('day');
      return dt >= start && dt <= end;
    }
    case 'recurring_days': {
      if (!rule.daysOfWeek?.length) return false;
      const current = luxonWeekdayToUserDay(dt.weekday);
      return rule.daysOfWeek.includes(current);
    }
    case 'recurring_time_window': {
      if (!rule.daysOfWeek?.length) return false;
      const current = luxonWeekdayToUserDay(dt.weekday);
      if (!rule.daysOfWeek.includes(current)) return false;
      if (!rule.startTime || !rule.endTime) return false;
      const [startH, startM] = rule.startTime.split(':').map(Number);
      const [endH, endM] = rule.endTime.split(':').map(Number);
      const minutes = dt.hour * 60 + dt.minute;
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      return minutes >= startMinutes && minutes <= endMinutes;
    }
    default:
      return false;
  }
}
