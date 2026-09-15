import { DayOfWeek } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import {
  assertValidVisibleHours,
  assertValidWeekStartsOn,
  parseTimeToMinutes,
} from './calendar-display-settings.util';

describe('calendar-display-settings.util', () => {
  describe('parseTimeToMinutes', () => {
    it('parses midnight and end of day', () => {
      expect(parseTimeToMinutes('00:00')).toBe(0);
      expect(parseTimeToMinutes('24:00')).toBe(24 * 60);
    });

    it('parses standard times', () => {
      expect(parseTimeToMinutes('07:30')).toBe(7 * 60 + 30);
    });
  });

  describe('assertValidVisibleHours', () => {
    it('accepts valid range', () => {
      expect(() =>
        assertValidVisibleHours('07:00', '22:00'),
      ).not.toThrow();
    });

    it('rejects end before start', () => {
      expect(() =>
        assertValidVisibleHours('22:00', '07:00'),
      ).toThrow(AppException);
    });

    it('rejects window shorter than 1 hour', () => {
      expect(() =>
        assertValidVisibleHours('07:00', '07:30'),
      ).toThrow(AppException);
    });
  });

  describe('assertValidWeekStartsOn', () => {
    it('accepts Sunday and Monday', () => {
      expect(() =>
        assertValidWeekStartsOn(DayOfWeek.SUNDAY),
      ).not.toThrow();
      expect(() =>
        assertValidWeekStartsOn(DayOfWeek.MONDAY),
      ).not.toThrow();
    });

    it('rejects other days', () => {
      expect(() =>
        assertValidWeekStartsOn(DayOfWeek.TUESDAY),
      ).toThrow(AppException);
    });
  });
});
