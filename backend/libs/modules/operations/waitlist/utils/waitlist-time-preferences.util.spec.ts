import { filterSlotsByTimePreferences } from './waitlist-time-preferences.util';

describe('filterSlotsByTimePreferences', () => {
  const slots = [
    { startAt: '2026-07-12T09:00:00.000Z', endAt: '2026-07-12T09:45:00.000Z', label: '9:00 AM', available: true },
    { startAt: '2026-07-12T14:00:00.000Z', endAt: '2026-07-12T14:45:00.000Z', label: '2:00 PM', available: true },
    { startAt: '2026-07-12T18:00:00.000Z', endAt: '2026-07-12T18:45:00.000Z', label: '6:00 PM', available: true },
  ];

  it('returns all slots when no preferences are selected', () => {
    expect(
      filterSlotsByTimePreferences(
        slots,
        {
          preferredMorning: false,
          preferredAfternoon: false,
          preferredEvening: false,
        },
        'America/New_York',
      ),
    ).toHaveLength(3);
  });

  it('filters slots by morning and afternoon preferences', () => {
    const filtered = filterSlotsByTimePreferences(
      slots,
      {
        preferredMorning: true,
        preferredAfternoon: true,
        preferredEvening: false,
      },
      'UTC',
    );

    expect(filtered).toHaveLength(2);
    expect(filtered.map((slot) => slot.label)).toEqual(['9:00 AM', '2:00 PM']);
  });
});
