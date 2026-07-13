import { DayOfWeek } from '@prisma/client';

export type BusinessHoursSlotInput = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
};

export const DEFAULT_BUSINESS_HOURS: BusinessHoursSlotInput[] = [
  {
    dayOfWeek: 'MONDAY',
    startTime: '09:00',
    endTime: '17:00',
    isEnabled: true,
  },
  {
    dayOfWeek: 'TUESDAY',
    startTime: '09:00',
    endTime: '17:00',
    isEnabled: true,
  },
  {
    dayOfWeek: 'WEDNESDAY',
    startTime: '09:00',
    endTime: '17:00',
    isEnabled: true,
  },
  {
    dayOfWeek: 'THURSDAY',
    startTime: '09:00',
    endTime: '17:00',
    isEnabled: true,
  },
  {
    dayOfWeek: 'FRIDAY',
    startTime: '09:00',
    endTime: '17:00',
    isEnabled: true,
  },
  {
    dayOfWeek: 'SATURDAY',
    startTime: '09:00',
    endTime: '17:00',
    isEnabled: false,
  },
  {
    dayOfWeek: 'SUNDAY',
    startTime: '09:00',
    endTime: '17:00',
    isEnabled: false,
  },
];

export const DAYS_OF_WEEK_ORDER: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];
