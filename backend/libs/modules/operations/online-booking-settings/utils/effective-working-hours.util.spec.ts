import {
  getWorkingWindowForDay,
  isRangeOutsideWorkingWindow,
  resolveEffectiveWeeklyHours,
} from './effective-working-hours.util';

describe('resolveEffectiveWeeklyHours', () => {
  const businessHours = [
    {
      id: '1',
      businessId: 'biz',
      dayOfWeek: 'MONDAY' as const,
      startTime: '09:00',
      endTime: '17:00',
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      businessId: 'biz',
      dayOfWeek: 'SATURDAY' as const,
      startTime: '09:00',
      endTime: '17:00',
      isEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it('uses business hours when staff schedule is not set', () => {
    const weekly = resolveEffectiveWeeklyHours(businessHours);
    const window = getWorkingWindowForDay(weekly, 'SATURDAY');
    expect(isRangeOutsideWorkingWindow(600, 690, window)).toBe(true);
  });

  it('prefers staff schedule over business hours when set', () => {
    const staffSchedules = [
      {
        id: 's1',
        businessId: 'biz',
        userId: 'staff',
        dayOfWeek: 'SATURDAY' as const,
        startTime: '10:00',
        endTime: '14:00',
        isEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const weekly = resolveEffectiveWeeklyHours(businessHours, staffSchedules);
    const window = getWorkingWindowForDay(weekly, 'SATURDAY');
    expect(isRangeOutsideWorkingWindow(600, 690, window)).toBe(false);
    expect(isRangeOutsideWorkingWindow(840, 900, window)).toBe(true);
  });
});
