import {
  computePaidMinutes,
  formatPaidHoursDisplay,
} from './paid-hours.util';

describe('paid-hours.util', () => {
  describe('formatPaidHoursDisplay', () => {
    it('formats minutes under an hour', () => {
      expect(formatPaidHoursDisplay(7)).toBe('7 min');
    });

    it('formats exactly one hour', () => {
      expect(formatPaidHoursDisplay(60)).toBe('1 hr');
      expect(formatPaidHoursDisplay(119)).toBe('1 hr');
    });

    it('formats multiple hours rounded', () => {
      expect(formatPaidHoursDisplay(120)).toBe('2 hr');
      expect(formatPaidHoursDisplay(540)).toBe('9 hr');
    });
  });

  describe('computePaidMinutes', () => {
    it('computes minute difference', () => {
      const clockIn = new Date('2026-06-28T14:06:00.000Z');
      const clockOut = new Date('2026-06-28T14:13:00.000Z');
      expect(computePaidMinutes(clockIn, clockOut)).toBe(7);
    });
  });
});
