import { DayOfWeek } from '@prisma/client';

export const DEFAULT_WEEKLY_AVAILABILITY: Array<{
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
}> = [
  { dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00', endTime: '17:00', isEnabled: true },
  { dayOfWeek: DayOfWeek.TUESDAY, startTime: '09:00', endTime: '17:00', isEnabled: true },
  { dayOfWeek: DayOfWeek.WEDNESDAY, startTime: '09:00', endTime: '17:00', isEnabled: true },
  { dayOfWeek: DayOfWeek.THURSDAY, startTime: '09:00', endTime: '17:00', isEnabled: true },
  { dayOfWeek: DayOfWeek.FRIDAY, startTime: '09:00', endTime: '17:00', isEnabled: true },
  { dayOfWeek: DayOfWeek.SATURDAY, startTime: '09:00', endTime: '12:00', isEnabled: false },
  { dayOfWeek: DayOfWeek.SUNDAY, startTime: '09:00', endTime: '12:00', isEnabled: false },
];
