import { DateTime } from 'luxon';
import {
  validateChainedStart,
  sumChainOccupancy,
} from './chained-booking-availability.util';
import { resolveGapAvoidancePolicy } from '@app/modules/operations/online-booking-settings/utils/gap-avoidance.util';

const tz = 'America/New_York';
const gapPolicy = resolveGapAvoidancePolicy({ avoidGapsEnabled: false });

function timing(minutes: number) {
  return {
    durationMinutes: minutes,
    hasProcessingTime: false,
    processingDurationMinutes: 0,
    finishDurationMinutes: null,
    hasBufferTime: false,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    clientOccupancyMinutes: minutes,
    staffBlockedMinutes: minutes,
    segments: [{ type: 'ACTIVE' as const, minutes }],
    slotDurationMinutes: minutes,
  };
}

describe('chained-booking-availability.util', () => {
  it('sums chain occupancy across services', () => {
    expect(
      sumChainOccupancy([
        { timing: timing(45) },
        { timing: timing(60) },
      ]),
    ).toBe(105);
  });

  it('accepts a chained start when second provider is free after first ends', () => {
    const day = DateTime.fromObject(
      { year: 2026, month: 7, day: 12, hour: 9, minute: 0 },
      { zone: tz },
    );
    const staffA = 'staff-a';
    const staffB = 'staff-b';

    const firstEnd = day.plus({ minutes: 45 });
    const appointments = [
      {
        startAt: day.plus({ minutes: 120 }).toUTC().toJSDate(),
        endAt: day.plus({ minutes: 180 }).toUTC().toJSDate(),
        assignedToId: staffB,
        serviceLines: [],
      },
    ];

    const resolved = validateChainedStart({
      chainStart: day,
      chain: [
        {
          serviceId: 'svc-1',
          staffId: staffA,
          timing: timing(45),
        },
        {
          serviceId: 'svc-2',
          staffId: staffB,
          timing: timing(60),
        },
      ],
      windowStartMin: 9 * 60,
      windowEndMin: 17 * 60,
      slotIntervalMin: 15,
      appointments,
      dayAppointments: appointments,
      tz,
      gapPolicy,
    });

    expect(resolved).not.toBeNull();
    expect(resolved).toHaveLength(2);
    expect(resolved![0].staffId).toBe(staffA);
    expect(resolved![1].staffId).toBe(staffB);
    expect(
      DateTime.fromJSDate(resolved![1].startAt, { zone: 'utc' })
        .setZone(tz)
        .toFormat('HH:mm'),
    ).toBe('09:45');
    expect(firstEnd.toFormat('HH:mm')).toBe('09:45');
  });

  it('rejects a chained start when second provider is busy during chained window', () => {
    const day = DateTime.fromObject(
      { year: 2026, month: 7, day: 12, hour: 9, minute: 0 },
      { zone: tz },
    );
    const staffA = 'staff-a';
    const staffB = 'staff-b';

    const appointments = [
      {
        startAt: day.plus({ minutes: 30 }).toUTC().toJSDate(),
        endAt: day.plus({ minutes: 90 }).toUTC().toJSDate(),
        assignedToId: staffB,
        serviceLines: [],
      },
    ];

    const resolved = validateChainedStart({
      chainStart: day,
      chain: [
        {
          serviceId: 'svc-1',
          staffId: staffA,
          timing: timing(45),
        },
        {
          serviceId: 'svc-2',
          staffId: staffB,
          timing: timing(60),
        },
      ],
      windowStartMin: 9 * 60,
      windowEndMin: 17 * 60,
      slotIntervalMin: 15,
      appointments,
      dayAppointments: appointments,
      tz,
      gapPolicy,
    });

    expect(resolved).toBeNull();
  });
});
