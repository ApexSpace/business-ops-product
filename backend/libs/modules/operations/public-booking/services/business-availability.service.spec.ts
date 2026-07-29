import { DateTime } from 'luxon';
import {
  GapEmptyDayMode,
  GapMultiProviderMode,
  GapTimeBlockMode,
} from '@prisma/client';
import {
  appointmentBlocksOverlap,
  resolveAppointmentBlockingWindow,
} from '@app/modules/operations/appointments/utils/appointment-blocking.util';
import { slotPassesGapAvoidanceForStaffIds } from '@app/modules/operations/online-booking-settings/utils/gap-avoidance.util';

const businessTz = 'Asia/Karachi';
const staffId = 'staff-1';

function karachiSlot(startHour: number, startMinute: number, durationMin: number) {
  const start = DateTime.fromObject(
    {
      year: 2026,
      month: 7,
      day: 15,
      hour: startHour,
      minute: startMinute,
    },
    { zone: businessTz },
  );
  const end = start.plus({ minutes: durationMin });
  return {
    startUtc: start.toUTC().toJSDate(),
    endUtc: end.toUTC().toJSDate(),
    startMin: startHour * 60 + startMinute,
    endMin: startHour * 60 + startMinute + durationMin,
  };
}

describe('public booking availability timezone + blocking', () => {
  it('detects overlap for appointments stored as true UTC instants', () => {
    const slot = karachiSlot(10, 0, 90);
    const appointment = {
      startAt: slot.startUtc,
      endAt: slot.endUtc,
      metadata: null,
    };

    const candidate = resolveAppointmentBlockingWindow(
      { startAt: slot.startUtc, endAt: slot.endUtc },
      { bufferBeforeMinutes: 0, bufferAfterMinutes: 0 },
    );

    expect(
      appointmentBlocksOverlap(
        resolveAppointmentBlockingWindow(appointment),
        candidate,
      ),
    ).toBe(true);
  });

  it('would miss overlap if UTC instants were misread as wall-clock timestamps', () => {
    const slot = karachiSlot(10, 0, 90);
    const candidate = resolveAppointmentBlockingWindow(
      { startAt: slot.startUtc, endAt: slot.endUtc },
      { bufferBeforeMinutes: 0, bufferAfterMinutes: 0 },
    );

    const misreadStart = DateTime.fromJSDate(slot.startUtc, { zone: 'utc' });
    const wrongInstant = DateTime.fromObject(
      {
        year: misreadStart.year,
        month: misreadStart.month,
        day: misreadStart.day,
        hour: misreadStart.hour,
        minute: misreadStart.minute,
      },
      { zone: businessTz },
    )
      .toUTC()
      .toJSDate();

    expect(
      appointmentBlocksOverlap(
        resolveAppointmentBlockingWindow({
          startAt: wrongInstant,
          endAt: DateTime.fromJSDate(wrongInstant)
            .plus({ minutes: 90 })
            .toJSDate(),
        }),
        candidate,
      ),
    ).toBe(false);
  });
});

describe('gap avoidance with corrected appointment anchors', () => {
  const strictPolicy = {
    enabled: true,
    maxGapMinutes: 0,
    minGapMinutes: null,
    timeBlockMode: GapTimeBlockMode.SAME_AS_APPOINTMENTS,
    emptyDayMode: GapEmptyDayMode.ALL_TIMES,
    multiProviderMode: GapMultiProviderMode.SAME_AS_SINGLE,
  };

  it('offers adjacent slots around a mid-day appointment on July 16', () => {
    const appointments = [
      {
        assignedToId: staffId,
        startAt: DateTime.fromObject(
          { year: 2026, month: 7, day: 16, hour: 13, minute: 30 },
          { zone: businessTz },
        )
          .toUTC()
          .toJSDate(),
        endAt: DateTime.fromObject(
          { year: 2026, month: 7, day: 16, hour: 15, minute: 0 },
          { zone: businessTz },
        )
          .toUTC()
          .toJSDate(),
        metadata: null,
      },
    ];

    const beforeAdjacent = slotPassesGapAvoidanceForStaffIds({
      slotStartMin: 12 * 60,
      slotEndMin: 13 * 60 + 30,
      shiftStartMin: 9 * 60,
      shiftEndMin: 16 * 60 + 30,
      slotDurationMin: 90,
      slotIntervalMin: 90,
      staffIds: [staffId],
      appointments,
      tz: businessTz,
      fallbackBuffers: {
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
      },
      policy: strictPolicy,
    });

    const afterAdjacent = slotPassesGapAvoidanceForStaffIds({
      slotStartMin: 15 * 60,
      slotEndMin: 16 * 60 + 30,
      shiftStartMin: 9 * 60,
      shiftEndMin: 16 * 60 + 30,
      slotDurationMin: 90,
      slotIntervalMin: 90,
      staffIds: [staffId],
      appointments,
      tz: businessTz,
      fallbackBuffers: {
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
      },
      policy: strictPolicy,
    });

    const isolatedMorning = slotPassesGapAvoidanceForStaffIds({
      slotStartMin: 9 * 60,
      slotEndMin: 10 * 60 + 30,
      shiftStartMin: 9 * 60,
      shiftEndMin: 16 * 60 + 30,
      slotDurationMin: 90,
      slotIntervalMin: 90,
      staffIds: [staffId],
      appointments,
      tz: businessTz,
      fallbackBuffers: {
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
      },
      policy: strictPolicy,
    });

    expect(beforeAdjacent).toBe(true);
    expect(afterAdjacent).toBe(true);
    expect(isolatedMorning).toBe(false);
  });

  it('offers the flush slot after a single morning appointment on July 14', () => {
    const appointments = [
      {
        assignedToId: staffId,
        startAt: DateTime.fromObject(
          { year: 2026, month: 7, day: 14, hour: 9, minute: 0 },
          { zone: businessTz },
        )
          .toUTC()
          .toJSDate(),
        endAt: DateTime.fromObject(
          { year: 2026, month: 7, day: 14, hour: 10, minute: 30 },
          { zone: businessTz },
        )
          .toUTC()
          .toJSDate(),
        metadata: {
          serviceTiming: { bufferBeforeMinutes: 0, bufferAfterMinutes: 30 },
        },
      },
    ];

    const flushSlot = slotPassesGapAvoidanceForStaffIds({
      slotStartMin: 10 * 60 + 30,
      slotEndMin: 12 * 60,
      shiftStartMin: 9 * 60,
      shiftEndMin: 17 * 60,
      slotDurationMin: 90,
      slotIntervalMin: 90,
      staffIds: [staffId],
      appointments,
      tz: businessTz,
      fallbackBuffers: { bufferBeforeMinutes: 30, bufferAfterMinutes: 0 },
      policy: strictPolicy,
    });

    expect(flushSlot).toBe(true);
  });
});
