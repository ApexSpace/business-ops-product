import {
  ChatbotBusinessHoursSettings,
  ChatbotMessagingSettings,
} from '../types/chatbot-settings.types';

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

function getZonedParts(
  date: Date,
  timezone: string,
): { weekday: number; minutes: number } {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const weekdayLabel =
      parts.find((part) => part.type === 'weekday')?.value ?? 'Mon';
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
    const minute = Number(
      parts.find((part) => part.type === 'minute')?.value ?? 0,
    );

    const weekdayMap: Record<string, number> = {
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
      Sun: 7,
    };

    return {
      weekday: weekdayMap[weekdayLabel] ?? 1,
      minutes: hour * 60 + minute,
    };
  } catch {
    const utcDay = date.getUTCDay();
    return {
      weekday: utcDay === 0 ? 7 : utcDay,
      minutes: date.getUTCHours() * 60 + date.getUTCMinutes(),
    };
  }
}

export function isBusinessHoursEnforced(
  businessHours: ChatbotBusinessHoursSettings,
  messaging: ChatbotMessagingSettings,
): boolean {
  return businessHours.enabled || messaging.businessHoursOnly;
}

export function isChatbotOnline(
  businessHours: ChatbotBusinessHoursSettings,
  messaging: ChatbotMessagingSettings,
  now: Date = new Date(),
): boolean {
  if (!isBusinessHoursEnforced(businessHours, messaging)) {
    return true;
  }

  const timezone = businessHours.timezone?.trim() || 'UTC';
  const { weekday, minutes } = getZonedParts(now, timezone);
  const intervals = businessHours.schedule[String(weekday)] ?? [];

  if (intervals.length === 0) {
    return false;
  }

  return intervals.some((interval) => {
    const start = parseTimeToMinutes(interval.start);
    const end = parseTimeToMinutes(interval.end);
    if (start === null || end === null) return false;
    if (end <= start) {
      return minutes >= start || minutes < end;
    }
    return minutes >= start && minutes < end;
  });
}
