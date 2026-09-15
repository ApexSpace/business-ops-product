import { resolveServiceTiming } from '@app/modules/crm/services/utils/service-timing.util';

describe('resolveServiceTiming', () => {
  it('computes client occupancy and staff blocked minutes', () => {
    const timing = resolveServiceTiming(
      {
        durationMinutes: 60,
        hasProcessingTime: true,
        processingDurationMinutes: 30,
        finishDurationMinutes: 15,
        hasBufferTime: true,
        bufferBeforeMinutes: 10,
        bufferAfterMinutes: 5,
      },
      { bufferBeforeMinutes: 0, bufferAfterMinutes: 0 },
    );

    expect(timing.clientOccupancyMinutes).toBe(105);
    expect(timing.staffBlockedMinutes).toBe(90);
  });
});
