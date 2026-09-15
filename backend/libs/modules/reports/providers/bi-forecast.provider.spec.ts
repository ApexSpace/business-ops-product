import { AppointmentStatus, DayOfWeek } from '@prisma/client';
import {
  BiForecastProvider,
  projectedAmountForAppointment,
} from './bi-forecast.provider';

describe('projectedAmountForAppointment', () => {
  it('sums service line prices and falls back to catalog price', () => {
    expect(
      projectedAmountForAppointment({
        serviceLines: [
          { price: 50, service: { price: 60 } },
          { price: null, service: { price: 40 } },
        ],
        service: { price: 999 },
      }),
    ).toBe(90);
  });

  it('uses primary service price when there are no lines', () => {
    expect(
      projectedAmountForAppointment({
        serviceLines: [],
        service: { price: 120 },
      }),
    ).toBe(120);
  });
});

describe('BiForecastProvider', () => {
  const businessId = 'biz-1';
  const context = {
    businessName: 'Acme Spa',
    timezone: 'UTC',
    currency: 'USD',
    generatedAt: new Date('2026-07-20T12:00:00.000Z'),
  };

  const filters = {
    dateRange: 'custom',
    fromDate: '2026-07-10',
    toDate: '2026-07-11',
    onlySpecificStaff: false,
    includePendingExpressBookings: false,
    staffIds: [],
  };

  function makePrisma(params: {
    schedules?: unknown[];
    exceptions?: unknown[];
    appointments?: unknown[];
  }) {
    return {
      staffWorkSchedule: {
        findMany: jest.fn().mockResolvedValue(params.schedules ?? []),
      },
      staffWorkException: {
        findMany: jest.fn().mockResolvedValue(params.exceptions ?? []),
      },
      appointment: {
        findMany: jest.fn().mockResolvedValue(params.appointments ?? []),
      },
    } as never;
  }

  it('builds Mangomint columns with daily productivity and projected amount', async () => {
    const prisma = makePrisma({
      schedules: [
        {
          userId: 'staff-1',
          dayOfWeek: DayOfWeek.FRIDAY,
          startTime: '09:00',
          endTime: '17:00',
        },
        {
          userId: 'staff-1',
          dayOfWeek: DayOfWeek.SATURDAY,
          startTime: '09:00',
          endTime: '17:00',
        },
      ],
      appointments: [
        {
          id: 'a1',
          assignedToId: 'staff-1',
          startAt: new Date('2026-07-10T15:00:00.000Z'),
          endAt: new Date('2026-07-10T17:00:00.000Z'),
          metadata: null,
          status: AppointmentStatus.CONFIRMED,
          service: { price: 100 },
          serviceLines: [{ price: 80, assignedToId: 'staff-1', service: { price: 100 } }],
        },
        {
          id: 'a2',
          assignedToId: 'staff-1',
          startAt: new Date('2026-07-10T18:00:00.000Z'),
          endAt: new Date('2026-07-10T19:00:00.000Z'),
          metadata: null,
          status: AppointmentStatus.CONFIRMED,
          service: { price: 50 },
          serviceLines: [],
        },
      ],
    });

    const provider = new BiForecastProvider(prisma);
    const doc = await provider.generate(businessId, filters, context);

    expect(doc.meta.description).toContain('productivity');
    const section = doc.sections[0]!;
    expect(section.columns.map((column) => column.key)).toEqual([
      'date',
      'appointments',
      'hoursBookedPct',
      'projectedAmount',
    ]);

    const july10 = section.rows.find((entry) => entry.id === '2026-07-10')!;
    expect(july10.cells.date).toBe('July 10');
    expect(july10.cells.appointments).toBe(2);
    // 3 booked hours / 8 available = 37.5%
    expect(july10.cells.hoursBookedPct).toBe(37.5);
    expect(july10.cells.projectedAmount).toBe(130);

    const july11 = section.rows.find((entry) => entry.id === '2026-07-11')!;
    expect(july11.cells.appointments).toBe(0);
    expect(july11.cells.hoursBookedPct).toBe(0);
    expect(july11.cells.projectedAmount).toBe(0);

    const total = section.rows.find((entry) => entry.isTotal)!;
    expect(total.cells.date).toBe('Total');
    expect(total.cells.appointments).toBe(2);
    // 3 / 16 = 18.75%
    expect(total.cells.hoursBookedPct).toBe(18.75);
    expect(total.cells.projectedAmount).toBe(130);
  });

  it('excludes pending express bookings from the Prisma query unless the toggle is on', async () => {
    const pending = {
      id: 'express-1',
      assignedToId: 'staff-1',
      startAt: new Date('2026-07-10T15:00:00.000Z'),
      endAt: new Date('2026-07-10T16:00:00.000Z'),
      metadata: null,
      status: AppointmentStatus.PENDING_COMPLETION,
      service: { price: 75 },
      serviceLines: [],
    };

    const offPrisma = makePrisma({
      schedules: [
        {
          userId: 'staff-1',
          dayOfWeek: DayOfWeek.FRIDAY,
          startTime: '09:00',
          endTime: '17:00',
        },
      ],
      appointments: [],
    });
    await new BiForecastProvider(offPrisma).generate(
      businessId,
      filters,
      context,
    );
    expect(offPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            notIn: expect.arrayContaining([
              AppointmentStatus.PENDING_COMPLETION,
            ]),
          },
        }),
      }),
    );

    const onPrisma = makePrisma({
      schedules: [
        {
          userId: 'staff-1',
          dayOfWeek: DayOfWeek.FRIDAY,
          startTime: '09:00',
          endTime: '17:00',
        },
      ],
      appointments: [pending],
    });
    const counted = await new BiForecastProvider(onPrisma).generate(
      businessId,
      {
        ...filters,
        includePendingExpressBookings: true,
      },
      context,
    );
    expect(onPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            notIn: [
              AppointmentStatus.CANCELLED,
              AppointmentStatus.NO_SHOW,
            ],
          },
        }),
      }),
    );
    expect(
      counted.sections[0]!.rows.find((r) => r.id === '2026-07-10')!.cells
        .appointments,
    ).toBe(1);
    expect(
      counted.sections[0]!.rows.find((r) => r.id === '2026-07-10')!.cells
        .projectedAmount,
    ).toBe(75);
  });

  it('filters appointments and schedules when onlySpecificStaff is on', async () => {
    const prisma = makePrisma({ appointments: [] });
    const provider = new BiForecastProvider(prisma);
    await provider.generate(
      businessId,
      {
        ...filters,
        onlySpecificStaff: true,
        staffIds: ['staff-a', 'staff-b'],
      },
      context,
    );

    expect(prisma.staffWorkSchedule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: { in: ['staff-a', 'staff-b'] },
        }),
      }),
    );
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignedToId: { in: ['staff-a', 'staff-b'] },
        }),
      }),
    );
  });

  it('ignores staffIds when onlySpecificStaff is off', async () => {
    const prisma = makePrisma({ appointments: [] });
    await new BiForecastProvider(prisma).generate(
      businessId,
      {
        ...filters,
        onlySpecificStaff: false,
        staffIds: ['staff-a'],
      },
      context,
    );

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          assignedToId: expect.anything(),
        }),
      }),
    );
  });
});
