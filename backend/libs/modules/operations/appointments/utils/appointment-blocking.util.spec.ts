import {
  appointmentBlocksOverlap,
  countClientOccupancyOverlaps,
  countStaffBlockingOverlaps,
  resolveAppointmentBlockingWindow,
} from './appointment-blocking.util';

describe('appointment-blocking.util', () => {
  const base = new Date('2026-07-14T10:34:00.000Z');
  const end = new Date('2026-07-14T12:04:00.000Z');

  it('extends blocking window with buffer after from metadata', () => {
    const window = resolveAppointmentBlockingWindow({
      startAt: base,
      endAt: end,
      metadata: {
        serviceTiming: {
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 4,
        },
      },
    });

    expect(window.blockEnd.getTime()).toBe(end.getTime() + 4 * 60_000);
  });

  it('detects overlap when next slot starts before prior buffer ends', () => {
    const existing = resolveAppointmentBlockingWindow({
      startAt: base,
      endAt: end,
      metadata: {
        serviceTiming: { bufferBeforeMinutes: 0, bufferAfterMinutes: 4 },
      },
    });
    const next = resolveAppointmentBlockingWindow(
      {
        startAt: new Date('2026-07-14T12:00:00.000Z'),
        endAt: new Date('2026-07-14T13:30:00.000Z'),
      },
      { bufferBeforeMinutes: 0, bufferAfterMinutes: 0 },
    );

    expect(appointmentBlocksOverlap(existing, next)).toBe(true);
  });

  it('allows back-to-back when buffer is zero', () => {
    const existing = resolveAppointmentBlockingWindow({
      startAt: base,
      endAt: end,
    });
    const next = resolveAppointmentBlockingWindow({
      startAt: end,
      endAt: new Date('2026-07-14T13:34:00.000Z'),
    });

    expect(appointmentBlocksOverlap(existing, next)).toBe(false);
  });

  it('uses explicit zero buffers from metadata without fallback', () => {
    const window = resolveAppointmentBlockingWindow(
      {
        startAt: base,
        endAt: end,
        metadata: {
          serviceTiming: {
            bufferBeforeMinutes: 0,
            bufferAfterMinutes: 0,
          },
        },
      },
      { bufferBeforeMinutes: 4, bufferAfterMinutes: 4 },
    );

    expect(window.blockEnd.getTime()).toBe(end.getTime());
  });

  it('allows back-to-back client occupancy when prior has buffer after', () => {
    const existingEnd = new Date('2026-07-14T05:30:00.000Z');
    const count = countClientOccupancyOverlaps(
      [
        {
          startAt: new Date('2026-07-14T04:00:00.000Z'),
          endAt: existingEnd,
          metadata: {
            serviceTiming: { bufferBeforeMinutes: 0, bufferAfterMinutes: 30 },
          },
        },
      ],
      {
        startAt: existingEnd,
        endAt: new Date('2026-07-14T07:00:00.000Z'),
      },
    );

    expect(count).toBe(0);
  });
});
