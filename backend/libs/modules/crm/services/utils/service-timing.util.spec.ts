import { resolveServiceTiming } from '../utils/service-timing.util';

describe('resolveServiceTiming', () => {
  it('computes client occupancy and staff blocked minutes', () => {
    const result = resolveServiceTiming({
      durationMinutes: 60,
      hasProcessingTime: true,
      processingDurationMinutes: 30,
      finishDurationMinutes: 15,
      hasBufferTime: true,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 5,
    });

    expect(result.clientOccupancyMinutes).toBe(105);
    expect(result.staffBlockedMinutes).toBe(90);
    expect(result.segments).toHaveLength(3);
  });

  it('uses zero buffer when service buffer is disabled', () => {
    const result = resolveServiceTiming(
      {
        durationMinutes: 45,
        hasProcessingTime: false,
        processingDurationMinutes: 0,
        finishDurationMinutes: null,
        hasBufferTime: false,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
      },
      { bufferBeforeMinutes: 5, bufferAfterMinutes: 10 },
    );

    expect(result.staffBlockedMinutes).toBe(45);
    expect(result.bufferBeforeMinutes).toBe(0);
    expect(result.bufferAfterMinutes).toBe(0);
  });
});
