import { DateTime } from 'luxon';
import { resolveReportDateRange } from './report-date-range.util';

describe('resolveReportDateRange', () => {
  const tz = 'America/New_York';

  it('resolves named month presets to the full calendar month', () => {
    const range = resolveReportDateRange(
      { dateRange: 'month:2026-07' },
      tz,
    );

    const start = DateTime.fromJSDate(range.start, { zone: 'utc' }).setZone(tz);
    const end = DateTime.fromJSDate(range.end, { zone: 'utc' }).setZone(tz);

    expect(start.toFormat('yyyy-MM-dd')).toBe('2026-07-01');
    expect(end.toFormat('yyyy-MM-dd')).toBe('2026-07-31');
    expect(range.periodLabel).toBe('July 2026');
    expect(range.preset).toBe('month:2026-07');
  });

  it('resolves month across year boundary', () => {
    const range = resolveReportDateRange(
      { dateRange: 'month:2025-12' },
      tz,
    );
    const start = DateTime.fromJSDate(range.start, { zone: 'utc' }).setZone(tz);
    const end = DateTime.fromJSDate(range.end, { zone: 'utc' }).setZone(tz);
    expect(start.toFormat('yyyy-MM-dd')).toBe('2025-12-01');
    expect(end.toFormat('yyyy-MM-dd')).toBe('2025-12-31');
    expect(range.periodLabel).toBe('December 2025');
  });
});
