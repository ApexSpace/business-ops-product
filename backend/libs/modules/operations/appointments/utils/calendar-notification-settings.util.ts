export interface CalendarNotificationSettings {
  reminderEnabled?: boolean;
  reminderHoursBefore?: number;
}

export const DEFAULT_REMINDER_HOURS_BEFORE = 24;

export function parseCalendarNotificationSettings(
  raw: unknown,
): CalendarNotificationSettings {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const settings = raw as Record<string, unknown>;

  return {
    reminderEnabled:
      settings.reminderEnabled === undefined
        ? true
        : Boolean(settings.reminderEnabled),
    reminderHoursBefore:
      typeof settings.reminderHoursBefore === 'number' &&
      settings.reminderHoursBefore > 0
        ? settings.reminderHoursBefore
        : DEFAULT_REMINDER_HOURS_BEFORE,
  };
}
