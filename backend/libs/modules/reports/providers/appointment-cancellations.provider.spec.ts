import {
  AppointmentSource,
  AppointmentStatus,
} from '@prisma/client';
import {
  AppointmentCancellationsProvider,
  classifyCancellationType,
  DEFAULT_LATE_CANCEL_HOURS,
} from './appointment-cancellations.provider';

describe('classifyCancellationType', () => {
  const startAt = new Date('2026-07-20T15:00:00.000Z');

  it('classifies expired express from metadata', () => {
    expect(
      classifyCancellationType(
        {
          status: AppointmentStatus.CANCELLED,
          source: AppointmentSource.EXPRESS,
          startAt,
          deletedAt: null,
          expressBookingCompletedAt: null,
          metadata: { expressExpired: true },
        },
        new Date('2026-07-19T12:00:00.000Z'),
      ),
    ).toBe('expired_express');
  });

  it('classifies soft-deleted express cancellations as expired', () => {
    expect(
      classifyCancellationType(
        {
          status: AppointmentStatus.CANCELLED,
          source: AppointmentSource.EXPRESS,
          startAt,
          deletedAt: new Date('2026-07-21T12:00:00.000Z'),
          expressBookingCompletedAt: null,
          metadata: null,
        },
        new Date('2026-07-20T12:00:00.000Z'),
      ),
    ).toBe('expired_express');
  });

  it('classifies deleted appointments', () => {
    expect(
      classifyCancellationType(
        {
          status: AppointmentStatus.CONFIRMED,
          source: AppointmentSource.INTERNAL,
          startAt,
          deletedAt: new Date('2026-07-19T12:00:00.000Z'),
          expressBookingCompletedAt: null,
          metadata: null,
        },
        new Date('2026-07-19T12:00:00.000Z'),
      ),
    ).toBe('deleted');
  });

  it('classifies no-shows', () => {
    expect(
      classifyCancellationType(
        {
          status: AppointmentStatus.NO_SHOW,
          source: AppointmentSource.INTERNAL,
          startAt,
          deletedAt: null,
          expressBookingCompletedAt: null,
          metadata: null,
        },
        startAt,
      ),
    ).toBe('no_show');
  });

  it('classifies late vs normal using the notice window', () => {
    const lateCancel = new Date(
      startAt.getTime() - (DEFAULT_LATE_CANCEL_HOURS - 1) * 3_600_000,
    );
    const normalCancel = new Date(
      startAt.getTime() - (DEFAULT_LATE_CANCEL_HOURS + 5) * 3_600_000,
    );

    expect(
      classifyCancellationType(
        {
          status: AppointmentStatus.CANCELLED,
          source: AppointmentSource.INTERNAL,
          startAt,
          deletedAt: null,
          expressBookingCompletedAt: null,
          metadata: null,
        },
        lateCancel,
      ),
    ).toBe('late');

    expect(
      classifyCancellationType(
        {
          status: AppointmentStatus.CANCELLED,
          source: AppointmentSource.INTERNAL,
          startAt,
          deletedAt: null,
          expressBookingCompletedAt: null,
          metadata: null,
        },
        normalCancel,
      ),
    ).toBe('normal');
  });
});

describe('AppointmentCancellationsProvider', () => {
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
    cancellationType: 'all',
  };

  function makePrisma(params: {
    appointments?: unknown[];
    audits?: unknown[];
    futures?: unknown[];
  }) {
    return {
      appointment: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(params.appointments ?? [])
          .mockResolvedValueOnce(params.futures ?? []),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue(params.audits ?? []),
      },
    } as never;
  }

  it('builds Mangomint columns with excel-only extras and filters by type', async () => {
    const prisma = makePrisma({
      appointments: [
        {
          id: 'a1',
          contactId: 'c1',
          assignedToId: 'staff-1',
          startAt: new Date('2026-07-15T15:00:00.000Z'),
          status: AppointmentStatus.CANCELLED,
          source: AppointmentSource.INTERNAL,
          notes: 'Client called',
          metadata: null,
          updatedAt: new Date('2026-07-10T10:00:00.000Z'),
          deletedAt: null,
          expressBookingCompletedAt: null,
          guestFirstName: null,
          guestEmail: null,
          guestPhone: null,
          guestPhoneCountryCode: null,
          contact: {
            displayName: 'Jane Client',
            firstName: 'Jane',
            lastName: 'Client',
            email: 'jane@example.com',
            phoneNumber: '555-0100',
            phoneCountryCode: '+1',
          },
          assignedTo: { firstName: 'Ada', lastName: 'Lovelace' },
          service: { name: 'Haircut', price: 50 },
          serviceLines: [],
        },
        {
          id: 'a2',
          contactId: 'c2',
          assignedToId: 'staff-1',
          startAt: new Date('2026-07-16T15:00:00.000Z'),
          status: AppointmentStatus.NO_SHOW,
          source: AppointmentSource.INTERNAL,
          notes: null,
          metadata: null,
          updatedAt: new Date('2026-07-16T16:00:00.000Z'),
          deletedAt: null,
          expressBookingCompletedAt: null,
          guestFirstName: null,
          guestEmail: null,
          guestPhone: null,
          guestPhoneCountryCode: null,
          contact: {
            displayName: 'Bob',
            firstName: 'Bob',
            lastName: null,
            email: null,
            phoneNumber: null,
            phoneCountryCode: null,
          },
          assignedTo: { firstName: 'Ada', lastName: 'Lovelace' },
          service: { name: 'Color', price: 120 },
          serviceLines: [],
        },
      ],
      audits: [
        {
          entityId: 'a1',
          action: 'appointment.status_changed',
          metadata: { from: 'CONFIRMED', to: 'CANCELLED' },
          createdAt: new Date('2026-07-10T09:00:00.000Z'),
          actor: { firstName: 'Front', lastName: 'Desk' },
        },
      ],
      futures: [
        {
          contactId: 'c1',
          startAt: new Date('2026-08-01T15:00:00.000Z'),
        },
      ],
    });

    const allDoc = await new AppointmentCancellationsProvider(prisma).generate(
      businessId,
      filters,
      context,
    );

    expect(allDoc.meta.footnotes[0]).toContain('Excel');
    const section = allDoc.sections[0]!;
    expect(section.columns.map((c) => c.key)).toEqual([
      'date',
      'client',
      'phone',
      'staff',
      'type',
      'canceledOn',
      'nextAppointment',
      'clientEmail',
      'service',
      'servicePrice',
      'notes',
      'canceledBy',
    ]);
    expect(
      section.columns.filter((c) => c.excelOnly).map((c) => c.key),
    ).toEqual(['clientEmail', 'service', 'servicePrice', 'notes', 'canceledBy']);

    const cancelRow = section.rows.find((r) => r.id === 'a1')!;
    expect(cancelRow.cells.client).toBe('Jane Client');
    expect(cancelRow.cells.phone).toBe('+1 555-0100');
    expect(cancelRow.cells.staff).toBe('Ada Lovelace');
    expect(cancelRow.cells.type).toBe('Normal Cancellation');
    expect(cancelRow.cells.nextAppointment).toBe('August 1, 2026');
    expect(cancelRow.cells.clientEmail).toBe('jane@example.com');
    expect(cancelRow.cells.service).toBe('Haircut');
    expect(cancelRow.cells.servicePrice).toBe(50);
    expect(cancelRow.cells.canceledBy).toBe('Front Desk');

    const noShow = section.rows.find((r) => r.id === 'a2')!;
    expect(noShow.cells.type).toBe('No Show');

    const prisma2 = makePrisma({
      appointments: [
        {
          id: 'a2',
          contactId: 'c2',
          assignedToId: 'staff-1',
          startAt: new Date('2026-07-16T15:00:00.000Z'),
          status: AppointmentStatus.NO_SHOW,
          source: AppointmentSource.INTERNAL,
          notes: null,
          metadata: null,
          updatedAt: new Date('2026-07-16T16:00:00.000Z'),
          deletedAt: null,
          expressBookingCompletedAt: null,
          guestFirstName: null,
          guestEmail: null,
          guestPhone: null,
          guestPhoneCountryCode: null,
          contact: {
            displayName: 'Bob',
            firstName: 'Bob',
            lastName: null,
            email: null,
            phoneNumber: null,
            phoneCountryCode: null,
          },
          assignedTo: { firstName: 'Ada', lastName: 'Lovelace' },
          service: { name: 'Color', price: 120 },
          serviceLines: [],
        },
      ],
      audits: [],
      futures: [],
    });
    const onlyNoShow = await new AppointmentCancellationsProvider(
      prisma2,
    ).generate(businessId, { ...filters, cancellationType: 'no_show' }, context);
    expect(onlyNoShow.sections[0]!.rows).toHaveLength(1);
    expect(onlyNoShow.sections[0]!.rows[0]!.cells.type).toBe('No Show');
  });

  it('returns empty rows when nothing matches', async () => {
    const prisma = makePrisma({ appointments: [] });
    const doc = await new AppointmentCancellationsProvider(prisma).generate(
      businessId,
      filters,
      context,
    );
    expect(doc.sections[0]!.rows).toEqual([]);
  });
});
