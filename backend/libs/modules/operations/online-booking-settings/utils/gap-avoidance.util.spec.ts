import {
  GapEmptyDayMode,
  GapMultiProviderMode,
  GapTimeBlockMode,
} from '@prisma/client';
import {
  computeShiftEdgeSlotStarts,
  isShiftEdgeSlot,
  slotPassesGapAvoidance,
  slotPassesGapAvoidanceForStaffIds,
  type GapAvoidancePolicy,
  type GapScheduleEvent,
} from './gap-avoidance.util';

const strictPolicy = (): GapAvoidancePolicy => ({
  enabled: true,
  maxGapMinutes: 0,
  minGapMinutes: null,
  timeBlockMode: GapTimeBlockMode.SAME_AS_APPOINTMENTS,
  emptyDayMode: GapEmptyDayMode.ALL_TIMES,
  multiProviderMode: GapMultiProviderMode.SAME_AS_SINGLE,
});

const shift = {
  shiftStartMin: 9 * 60,
  shiftEndMin: 17 * 60,
  slotDurationMin: 30,
  slotIntervalMin: 15,
};

function check(
  slotStartMin: number,
  events: GapScheduleEvent[],
  policy: GapAvoidancePolicy,
) {
  return slotPassesGapAvoidance({
    slotStartMin,
    slotEndMin: slotStartMin + shift.slotDurationMin,
    shiftStartMin: shift.shiftStartMin,
    shiftEndMin: shift.shiftEndMin,
    slotDurationMin: shift.slotDurationMin,
    slotIntervalMin: shift.slotIntervalMin,
    events,
    policy,
  });
}

describe('slotPassesGapAvoidance', () => {
  it('allows all shift slots on an empty day when mode=all', () => {
    const policy = strictPolicy();
    expect(check(9 * 60, [], policy)).toBe(true);
    expect(check(12 * 60, [], policy)).toBe(true);
    expect(check(16 * 60 + 30, [], policy)).toBe(true);
  });

  it('allows only shift edge slots on an empty day when mode=shift edges', () => {
    const policy: GapAvoidancePolicy = {
      ...strictPolicy(),
      emptyDayMode: GapEmptyDayMode.SHIFT_EDGES_ONLY,
    };
    const edges = computeShiftEdgeSlotStarts({
      shiftStartMin: shift.shiftStartMin,
      shiftEndMin: shift.shiftEndMin,
      slotDurationMin: shift.slotDurationMin,
      slotIntervalMin: shift.slotIntervalMin,
    });

    expect(check(edges.firstStartMin, [], policy)).toBe(true);
    expect(check(edges.lastStartMin, [], policy)).toBe(true);
    expect(check(12 * 60, [], policy)).toBe(false);
  });

  it('offers only directly before/after a mid-day appointment when max gap is 0', () => {
    const policy = strictPolicy();
    const appt: GapScheduleEvent[] = [
      { startMin: 10 * 60, endMin: 11 * 60, isTimeBlock: false },
    ];

    expect(check(9 * 60 + 30, appt, policy)).toBe(true);
    expect(check(11 * 60, appt, policy)).toBe(true);
    expect(check(9 * 60, appt, policy)).toBe(false);
    expect(check(12 * 60, appt, policy)).toBe(false);
  });

  it('clusters around time blocks when mode=same as appointments', () => {
    const policy = strictPolicy();
    const events: GapScheduleEvent[] = [
      { startMin: 12 * 60, endMin: 13 * 60, isTimeBlock: true },
    ];

    expect(check(11 * 60 + 30, events, policy)).toBe(true);
    expect(check(13 * 60, events, policy)).toBe(true);
    expect(check(11 * 60, events, policy)).toBe(false);
  });

  it('does not offer slots adjacent to time blocks when mode=ignore', () => {
    const policy: GapAvoidancePolicy = {
      ...strictPolicy(),
      timeBlockMode: GapTimeBlockMode.IGNORE,
    };
    const events: GapScheduleEvent[] = [
      { startMin: 12 * 60, endMin: 13 * 60, isTimeBlock: true },
    ];

    expect(check(11 * 60 + 30, events, policy)).toBe(false);
    expect(check(13 * 60, events, policy)).toBe(false);
    expect(check(11 * 60, events, policy)).toBe(true);
  });

  it('rejects a 20-minute sliver when min gap is 30', () => {
    const policy: GapAvoidancePolicy = {
      ...strictPolicy(),
      maxGapMinutes: null,
      minGapMinutes: 30,
    };
    const events: GapScheduleEvent[] = [
      { startMin: 9 * 60, endMin: 10 * 60, isTimeBlock: false },
      { startMin: 11 * 60 + 20, endMin: 12 * 60, isTimeBlock: false },
    ];

    expect(check(10 * 60, events, policy)).toBe(true);
    expect(check(10 * 60 + 30, events, policy)).toBe(false);
  });

  it('rejects slots that leave a gap larger than max gap between appointments', () => {
    const policy: GapAvoidancePolicy = {
      ...strictPolicy(),
      maxGapMinutes: 60,
    };
    const events: GapScheduleEvent[] = [
      { startMin: 10 * 60, endMin: 11 * 60, isTimeBlock: false },
      { startMin: 13 * 60 + 30, endMin: 14 * 60 + 30, isTimeBlock: false },
    ];

    expect(check(12 * 60, events, policy)).toBe(true);
    expect(check(11 * 60, events, policy)).toBe(false);
    expect(check(12 * 60 + 30, events, policy)).toBe(false);
  });

  it('does not let pre-shift appointments block the entire working day', () => {
    const policy = strictPolicy();
    const events: GapScheduleEvent[] = [
      { startMin: 5 * 60, endMin: 6 * 60 + 30, isTimeBlock: false },
      { startMin: 6 * 60 + 30, endMin: 8 * 60, isTimeBlock: false },
    ];

    expect(check(9 * 60, events, policy)).toBe(true);
    expect(check(12 * 60, events, policy)).toBe(true);
  });
});

describe('slotPassesGapAvoidanceForStaffIds', () => {
  it('does not restrict staff B using staff A appointments', () => {
    const policy = strictPolicy();
    const appointments = [
      {
        assignedToId: 'staff-a',
        startAt: new Date('2026-07-11T10:00:00.000Z'),
        endAt: new Date('2026-07-11T11:00:00.000Z'),
        metadata: null,
      },
    ];

    expect(
      slotPassesGapAvoidanceForStaffIds({
        slotStartMin: 12 * 60,
        slotEndMin: 12 * 60 + 30,
        shiftStartMin: shift.shiftStartMin,
        shiftEndMin: shift.shiftEndMin,
        slotDurationMin: shift.slotDurationMin,
        slotIntervalMin: shift.slotIntervalMin,
        staffIds: ['staff-b'],
        appointments,
        tz: 'UTC',
        fallbackBuffers: {
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 0,
        },
        policy,
      }),
    ).toBe(true);
  });

  it('requires each staff member to pass gap rules in multi-staff mode', () => {
    const policy = strictPolicy();
    const appointments = [
      {
        assignedToId: 'staff-a',
        startAt: new Date('2026-07-11T10:00:00.000Z'),
        endAt: new Date('2026-07-11T11:00:00.000Z'),
        metadata: null,
      },
      {
        assignedToId: 'staff-b',
        startAt: new Date('2026-07-11T10:00:00.000Z'),
        endAt: new Date('2026-07-11T11:00:00.000Z'),
        metadata: null,
      },
    ];

    expect(
      slotPassesGapAvoidanceForStaffIds({
        slotStartMin: 12 * 60,
        slotEndMin: 12 * 60 + 30,
        shiftStartMin: shift.shiftStartMin,
        shiftEndMin: shift.shiftEndMin,
        slotDurationMin: shift.slotDurationMin,
        slotIntervalMin: shift.slotIntervalMin,
        staffIds: ['staff-a', 'staff-b'],
        appointments,
        tz: 'UTC',
        fallbackBuffers: {
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 0,
        },
        policy,
      }),
    ).toBe(false);

    expect(
      slotPassesGapAvoidanceForStaffIds({
        slotStartMin: 11 * 60,
        slotEndMin: 11 * 60 + 30,
        shiftStartMin: shift.shiftStartMin,
        shiftEndMin: shift.shiftEndMin,
        slotDurationMin: shift.slotDurationMin,
        slotIntervalMin: shift.slotIntervalMin,
        staffIds: ['staff-a', 'staff-b'],
        appointments,
        tz: 'UTC',
        fallbackBuffers: {
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 0,
        },
        policy,
      }),
    ).toBe(true);
  });
});

describe('isShiftEdgeSlot', () => {
  it('identifies first and last valid slot starts', () => {
    expect(
      isShiftEdgeSlot({
        slotStartMin: 9 * 60,
        shiftStartMin: 9 * 60,
        shiftEndMin: 17 * 60,
        slotDurationMin: 30,
        slotIntervalMin: 15,
      }),
    ).toBe(true);
    expect(
      isShiftEdgeSlot({
        slotStartMin: 16 * 60 + 30,
        shiftStartMin: 9 * 60,
        shiftEndMin: 17 * 60,
        slotDurationMin: 30,
        slotIntervalMin: 15,
      }),
    ).toBe(true);
    expect(
      isShiftEdgeSlot({
        slotStartMin: 12 * 60,
        shiftStartMin: 9 * 60,
        shiftEndMin: 17 * 60,
        slotDurationMin: 30,
        slotIntervalMin: 15,
      }),
    ).toBe(false);
  });
});
