import { isFullDayUnavailable, isPartialDayException } from './full-day-exception.util';

describe('full-day-exception.util', () => {
  it('identifies full-day unavailable rows', () => {
    expect(
      isFullDayUnavailable({
        isUnavailable: true,
        startTime: null,
        endTime: null,
      }),
    ).toBe(true);
  });

  it('rejects partial-day rows', () => {
    expect(
      isPartialDayException({ startTime: '09:00', endTime: null }),
    ).toBe(true);
    expect(
      isFullDayUnavailable({
        isUnavailable: true,
        startTime: '09:00',
        endTime: '17:00',
      }),
    ).toBe(false);
  });
});
