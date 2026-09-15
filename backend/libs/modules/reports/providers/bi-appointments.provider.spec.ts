import {
  bookedHoursForAppointment,
  isPrebooking,
  isStaffRequested,
  isWalkIn,
  BiAppointmentsProvider,
} from './bi-appointments.provider';

describe('BI appointment helpers', () => {
  it('detects walk-ins within ±1 hour of start', () => {
    const start = new Date('2026-07-10T15:00:00.000Z');
    expect(isWalkIn(new Date('2026-07-10T14:30:00.000Z'), start)).toBe(true);
    expect(isWalkIn(new Date('2026-07-10T15:45:00.000Z'), start)).toBe(true);
    expect(isWalkIn(new Date('2026-07-10T12:00:00.000Z'), start)).toBe(false);
  });

  it('detects prebookings from future appointments created by start+24h', () => {
    const appt = {
      contactId: 'c1',
      startAt: new Date('2026-07-10T15:00:00.000Z'),
    };
    const futures = new Map([
      [
        'c1',
        [
          {
            startAt: new Date('2026-07-24T15:00:00.000Z'),
            createdAt: new Date('2026-07-10T16:00:00.000Z'),
          },
        ],
      ],
    ]);
    expect(isPrebooking(appt, futures)).toBe(true);
  });

  it('treats anyone bookings as not staff-requested', () => {
    expect(isStaffRequested({ anyone: true })).toBe(false);
    expect(isStaffRequested({ anyone: false })).toBe(true);
    expect(isStaffRequested(null)).toBe(true);
  });

  it('excludes processing minutes from booked hours when toggle is off', () => {
    const appt = {
      startAt: new Date('2026-07-10T15:00:00.000Z'),
      endAt: new Date('2026-07-10T16:30:00.000Z'),
      metadata: {
        serviceTiming: {
          staffBlockedMinutes: 60,
          clientOccupancyMinutes: 90,
          segments: [
            { type: 'ACTIVE', minutes: 60 },
            { type: 'PROCESSING', minutes: 30 },
          ],
        },
      },
    };
    expect(bookedHoursForAppointment(appt, false)).toBe(1);
    expect(bookedHoursForAppointment(appt, true)).toBe(1.5);
  });
});

describe('BiAppointmentsProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Acme Spa',
    timezone: 'UTC',
    currency: 'USD',
    generatedAt: new Date('2026-07-20T12:00:00.000Z'),
  };

  const filters = {
    dateRange: 'custom',
    fromDate: '2026-07-01',
    toDate: '2026-07-31',
    staffIds: [],
    includeProcessingTimeAsBooked: false,
    includeTimeBlocksAsAvailable: false,
  };

  function makePrisma(params: {
    schedules?: unknown[];
    exceptions?: unknown[];
    appointments?: unknown[];
    priors?: unknown[];
    futures?: unknown[];
  }) {
    return {
      staffWorkSchedule: {
        findMany: jest.fn().mockResolvedValue(params.schedules ?? []),
      },
      staffWorkException: {
        findMany: jest.fn().mockResolvedValue(params.exceptions ?? []),
      },
      appointment: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(params.appointments ?? [])
          .mockResolvedValueOnce(params.priors ?? [])
          .mockResolvedValueOnce(params.futures ?? []),
      },
    } as never;
  }

  it('builds Mangomint columns with percentages and All Selected total', async () => {
    const prisma = makePrisma({
      schedules: [
        {
          userId: 'staff-1',
          dayOfWeek: 'WEDNESDAY',
          startTime: '09:00',
          endTime: '17:00',
          isEnabled: true,
          user: { firstName: 'Andre', lastName: 'Butler' },
        },
      ],
      appointments: [
        {
          id: 'a1',
          contactId: 'c1',
          assignedToId: 'staff-1',
          startAt: new Date('2026-07-01T15:00:00.000Z'), // Wednesday
          endAt: new Date('2026-07-01T16:00:00.000Z'),
          createdAt: new Date('2026-06-20T12:00:00.000Z'),
          metadata: {
            serviceTiming: {
              staffBlockedMinutes: 60,
              clientOccupancyMinutes: 60,
              segments: [{ type: 'ACTIVE', minutes: 60 }],
            },
          },
          assignedTo: { firstName: 'Andre', lastName: 'Butler' },
        },
        {
          id: 'a2',
          contactId: 'c1',
          assignedToId: 'staff-1',
          startAt: new Date('2026-07-08T15:00:00.000Z'),
          endAt: new Date('2026-07-08T15:30:00.000Z'),
          createdAt: new Date('2026-07-01T16:00:00.000Z'),
          metadata: { anyone: false },
          assignedTo: { firstName: 'Andre', lastName: 'Butler' },
        },
      ],
      priors: [],
      futures: [
        {
          contactId: 'c1',
          startAt: new Date('2026-07-08T15:00:00.000Z'),
          createdAt: new Date('2026-07-01T16:00:00.000Z'),
        },
      ],
    });

    const provider = new BiAppointmentsProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    expect(doc.meta.footnotes?.[0]).toContain('Prebooking');
    expect(doc.sections[0]!.columns.map((c) => c.key)).toEqual(
      expect.arrayContaining([
        'staff',
        'hoursAvail',
        'hoursBooked',
        'hoursBookedPct',
        'allTotal',
        'allRequested',
        'allWalkIns',
        'allPrebookings',
        'newTotal',
      ]),
    );

    const staffRow = doc.sections[0]!.rows.find(
      (r) => r.cells.staff === 'Andre Butler',
    )!;
    expect(staffRow.cells.allTotal).toBe(2);
    expect(staffRow.cells.allRequested).toBe(2);
    expect(staffRow.cells.allPrebookings).toBe(1);
    expect(staffRow.cells.newTotal).toBe(1);
    expect(Number(staffRow.cells.hoursBooked)).toBeCloseTo(1.5, 5);

    const total = doc.sections[0]!.rows.find((r) => r.isTotal)!;
    expect(total.cells.staff).toBe('All Selected');
    expect(total.cells.allTotal).toBe(2);
  });

  it('adds time block hours to available when toggle is on', async () => {
    const prisma = makePrisma({
      schedules: [],
      appointments: [
        {
          id: 'block-1',
          contactId: null,
          assignedToId: 'staff-1',
          startAt: new Date('2026-07-01T12:00:00.000Z'),
          endAt: new Date('2026-07-01T14:00:00.000Z'),
          createdAt: new Date('2026-07-01T10:00:00.000Z'),
          metadata: { kind: 'TIME_BLOCK' },
          assignedTo: { firstName: 'Sam', lastName: 'Staff' },
        },
      ],
      priors: [],
      futures: [],
    });

    const provider = new BiAppointmentsProvider(prisma);
    const doc = await provider.generate(
      businessId,
      { ...filters, includeTimeBlocksAsAvailable: true },
      context,
    );

    const staffRow = doc.sections[0]!.rows.find(
      (r) => r.cells.staff === 'Sam Staff',
    )!;
    expect(staffRow.cells.hoursAvail).toBe('2.00');
    expect(staffRow.cells.allTotal).toBe(0);
  });
});
