export interface ChatbotBusinessHoursInterval {
  start: string;
  end: string;
}

export type ChatbotBusinessHoursSchedule = Record<
  string,
  ChatbotBusinessHoursInterval[]
>;

export interface ChatbotBusinessHoursSettings {
  enabled: boolean;
  timezone: string;
  schedule: ChatbotBusinessHoursSchedule;
}

export interface BusinessHoursDaySlot {
  weekday: string;
  label: string;
  isEnabled: boolean;
  start: string;
  end: string;
}

export const CHATBOT_WEEKDAYS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "1", label: "Monday" },
  { key: "2", label: "Tuesday" },
  { key: "3", label: "Wednesday" },
  { key: "4", label: "Thursday" },
  { key: "5", label: "Friday" },
  { key: "6", label: "Saturday" },
  { key: "7", label: "Sunday" },
];

export function defaultBusinessHoursSchedule(): ChatbotBusinessHoursSchedule {
  const schedule: ChatbotBusinessHoursSchedule = {};
  for (let day = 1; day <= 5; day += 1) {
    schedule[String(day)] = [{ start: "09:00", end: "17:00" }];
  }
  return schedule;
}

export function defaultBusinessHoursSettings(
  timezone = "UTC",
): ChatbotBusinessHoursSettings {
  return {
    enabled: false,
    timezone,
    schedule: defaultBusinessHoursSchedule(),
  };
}

export function normalizeBusinessHoursSettings(
  raw: ChatbotBusinessHoursSettings | undefined | null,
  fallbackTimezone = "UTC",
): ChatbotBusinessHoursSettings {
  if (!raw) {
    return defaultBusinessHoursSettings(fallbackTimezone);
  }
  return {
    enabled: raw.enabled === true,
    timezone: raw.timezone?.trim() || fallbackTimezone,
    schedule:
      raw.schedule &&
      typeof raw.schedule === "object" &&
      hasConfiguredSchedule(raw.schedule)
        ? raw.schedule
        : defaultBusinessHoursSchedule(),
  };
}

export function businessHoursToSlots(
  settings: ChatbotBusinessHoursSettings,
): BusinessHoursDaySlot[] {
  return CHATBOT_WEEKDAYS.map(({ key, label }) => {
    const intervals = settings.schedule[key] ?? [];
    const first = intervals[0];
    return {
      weekday: key,
      label,
      isEnabled: intervals.length > 0,
      start: first?.start ?? "09:00",
      end: first?.end ?? "17:00",
    };
  });
}

export function slotsToBusinessHoursSchedule(
  slots: BusinessHoursDaySlot[],
): ChatbotBusinessHoursSchedule {
  const schedule: ChatbotBusinessHoursSchedule = {};
  for (const slot of slots) {
    if (slot.isEnabled) {
      schedule[slot.weekday] = [{ start: slot.start, end: slot.end }];
    }
  }
  return schedule;
}

export function hasConfiguredSchedule(
  schedule: ChatbotBusinessHoursSchedule,
): boolean {
  return Object.values(schedule).some((intervals) => intervals.length > 0);
}
