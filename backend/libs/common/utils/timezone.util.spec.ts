import { parseCalendarDateKey } from './timezone.util';

describe('parseCalendarDateKey', () => {
  it('reads @db.Date values as calendar dates without timezone drift', () => {
    const prismaDate = new Date('2026-07-16T00:00:00.000Z');
    expect(parseCalendarDateKey(prismaDate)).toBe('2026-07-16');
  });
});
