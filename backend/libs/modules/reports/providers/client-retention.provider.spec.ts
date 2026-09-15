import { AppointmentStatus } from '@prisma/client';
import {
  ClientRetentionProvider,
  buildInitialClientFootnote,
  retentionFlagsForDays,
} from './client-retention.provider';

describe('retentionFlagsForDays', () => {
  it('marks nested retention windows from the soonest return visit', () => {
    expect(retentionFlagsForDays([25])).toEqual({
      retained30: true,
      retained60: true,
      retained90: true,
      retained180: true,
    });
    expect(retentionFlagsForDays([45])).toEqual({
      retained30: false,
      retained60: true,
      retained90: true,
      retained180: true,
    });
    expect(retentionFlagsForDays([100])).toEqual({
      retained30: false,
      retained60: false,
      retained90: false,
      retained180: true,
    });
    expect(retentionFlagsForDays([200])).toEqual({
      retained30: false,
      retained60: false,
      retained90: false,
      retained180: false,
    });
  });
});

describe('buildInitialClientFootnote', () => {
  it('embeds the selected period bounds', () => {
    const note = buildInitialClientFootnote(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-31T23:59:59.999Z'),
      'UTC',
    );
    expect(note).toContain('July 1, 2026');
    expect(note).toContain('July 31, 2026');
    expect(note).toContain('Initial clients');
  });
});

describe('ClientRetentionProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Acme Spa',
    timezone: 'UTC',
    currency: 'USD',
    generatedAt: new Date('2026-07-20T12:00:00.000Z'),
  };

  const filters = {
    dateRange: 'month:2026-06',
    staffIds: [],
  };

  function makePrisma(params: {
    period?: unknown[];
    followUps?: unknown[];
    users?: unknown[];
  }) {
    return {
      appointment: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(params.period ?? [])
          .mockResolvedValueOnce(params.followUps ?? []),
      },
      user: {
        findMany: jest.fn().mockResolvedValue(params.users ?? []),
      },
    } as never;
  }

  it('builds staff rows with 30/60/90/180 retention and All Selected Staff', async () => {
    const prisma = makePrisma({
      period: [
        {
          id: 'a1',
          contactId: 'c1',
          assignedToId: 'staff-1',
          startAt: new Date('2026-06-05T15:00:00.000Z'),
          metadata: null,
          assignedTo: { firstName: 'Ada', lastName: 'Lovelace' },
          serviceLines: [],
        },
        {
          id: 'a2',
          contactId: 'c2',
          assignedToId: 'staff-1',
          startAt: new Date('2026-06-10T15:00:00.000Z'),
          metadata: null,
          assignedTo: { firstName: 'Ada', lastName: 'Lovelace' },
          serviceLines: [],
        },
        {
          id: 'a3',
          contactId: 'c3',
          assignedToId: 'staff-2',
          startAt: new Date('2026-06-12T15:00:00.000Z'),
          metadata: null,
          assignedTo: { firstName: 'Grace', lastName: 'Hopper' },
          serviceLines: [],
        },
      ],
      followUps: [
        // c1 returns in 20 days → all windows
        {
          contactId: 'c1',
          startAt: new Date('2026-06-25T15:00:00.000Z'),
          metadata: null,
        },
        // c2 returns in 100 days → 180 only
        {
          contactId: 'c2',
          startAt: new Date('2026-09-18T15:00:00.000Z'),
          metadata: null,
        },
        // c3 never returns
      ],
    });

    const doc = await new ClientRetentionProvider(prisma).generate(
      businessId,
      filters,
      context,
    );

    expect(doc.meta.description).toContain('30, 60, 90, or 180');
    expect(doc.meta.footnotes[0]).toContain('Initial clients');

    const section = doc.sections[0]!;
    expect(section.columns.map((c) => c.key)).toEqual([
      'staff',
      'total',
      'retained30',
      'retained30Pct',
      'retained60',
      'retained60Pct',
      'retained90',
      'retained90Pct',
      'retained180',
      'retained180Pct',
    ]);

    const ada = section.rows.find((r) => r.id === 'staff-1')!;
    expect(ada.cells.staff).toBe('Ada Lovelace');
    expect(ada.cells.total).toBe(2);
    expect(ada.cells.retained30).toBe(1);
    expect(ada.cells.retained30Pct).toBe(50);
    expect(ada.cells.retained180).toBe(2);
    expect(ada.cells.retained180Pct).toBe(100);

    const grace = section.rows.find((r) => r.id === 'staff-2')!;
    expect(grace.cells.total).toBe(1);
    expect(grace.cells.retained30).toBe(0);
    expect(grace.cells.retained180).toBe(0);

    const total = section.rows.find((r) => r.isTotal)!;
    expect(total.cells.staff).toBe('All Selected Staff');
    expect(total.cells.total).toBe(3);
    expect(total.cells.retained30).toBe(1);
    expect(total.cells.retained180).toBe(2);
  });

  it('filters by team members and still loads zero rows for selected staff', async () => {
    const prisma = makePrisma({
      period: [
        {
          id: 'a1',
          contactId: 'c1',
          assignedToId: 'staff-1',
          startAt: new Date('2026-06-05T15:00:00.000Z'),
          metadata: null,
          assignedTo: { firstName: 'Ada', lastName: 'Lovelace' },
          serviceLines: [],
        },
      ],
      followUps: [],
      users: [{ id: 'staff-2', firstName: 'Grace', lastName: 'Hopper' }],
    });

    const doc = await new ClientRetentionProvider(prisma).generate(
      businessId,
      { ...filters, staffIds: ['staff-2'] },
      context,
    );

    const section = doc.sections[0]!;
    expect(section.rows.filter((r) => !r.isTotal)).toHaveLength(1);
    expect(section.rows[0]!.cells.staff).toBe('Grace Hopper');
    expect(section.rows[0]!.cells.total).toBe(0);
    expect(section.rows.find((r) => r.isTotal)!.cells.total).toBe(0);
  });

  it('excludes cancelled, no-show, and pending express appointments', async () => {
    const prisma = makePrisma({ period: [], followUps: [] });
    await new ClientRetentionProvider(prisma).generate(
      businessId,
      filters,
      context,
    );

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            notIn: [
              AppointmentStatus.CANCELLED,
              AppointmentStatus.NO_SHOW,
              AppointmentStatus.PENDING_COMPLETION,
            ],
          },
        }),
      }),
    );
  });
});
