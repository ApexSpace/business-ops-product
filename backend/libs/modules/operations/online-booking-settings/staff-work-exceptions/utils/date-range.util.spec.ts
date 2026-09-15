import {
  expandInclusiveDateRange,
  resolveInclusiveToDate,
} from './date-range.util';

describe('date-range.util', () => {
  it('defaults toDate to fromDate', () => {
    expect(resolveInclusiveToDate('2026-09-02', undefined)).toBe('2026-09-02');
    expect(resolveInclusiveToDate('2026-09-02', '  ')).toBe('2026-09-02');
  });

  it('expands inclusive single day', () => {
    const dates = expandInclusiveDateRange(
      '2026-09-02',
      '2026-09-02',
      'America/New_York',
    );
    expect(dates).toHaveLength(1);
  });

  it('expands inclusive multi-day range', () => {
    const dates = expandInclusiveDateRange(
      '2026-09-01',
      '2026-09-03',
      'UTC',
    );
    expect(dates).toHaveLength(3);
  });

  it('rejects inverted ranges', () => {
    expect(() =>
      expandInclusiveDateRange('2026-09-05', '2026-09-01', 'UTC'),
    ).toThrow(/toDate must be on or after fromDate/);
  });

  it('rejects ranges over 366 days', () => {
    expect(() =>
      expandInclusiveDateRange('2026-01-01', '2027-01-02', 'UTC'),
    ).toThrow(/366 days/);
  });
});
