import { AppointmentStatus } from '@prisma/client';
import { AppointmentRepository } from './appointment.repository';
import { acquireStaffSlotLocks } from '../utils/appointment-staff-slot-lock.util';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';

describe('AppointmentRepository staff slot lock (BOOK-06)', () => {
  const businessId = 'biz-1';
  const staffId = 'staff-1';
  const startAt = new Date('2030-01-15T15:00:00.000Z');
  const endAt = new Date('2030-01-15T16:00:00.000Z');

  it('acquires advisory locks in sorted staff order inside the transaction', async () => {
    const executeRaw = jest.fn().mockResolvedValue(1);
    const tx = { $executeRaw: executeRaw };
    const prisma = {
      $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    };
    const repository = new AppointmentRepository(prisma as never);

    await repository.runWithStaffSlotLock(
      businessId,
      ['staff-b', 'staff-a', 'staff-b'],
      async () => 'ok',
    );

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(executeRaw).toHaveBeenCalledTimes(2);
    const firstCall = executeRaw.mock.calls[0];
    const secondCall = executeRaw.mock.calls[1];
    expect(String(firstCall[0].join(''))).toContain('pg_advisory_xact_lock');
    expect(firstCall.slice(1)).toEqual([businessId, 'staff-a']);
    expect(secondCall.slice(1)).toEqual([businessId, 'staff-b']);
  });

  it('BOOK-06: parallel creates for the same staff window — one insert, one conflict', async () => {
    let chain = Promise.resolve();
    const rows: Array<{
      id: string;
      assignedToId: string;
      startAt: Date;
      endAt: Date;
      status: AppointmentStatus;
      deletedAt: Date | null;
    }> = [];

    const prisma = {
      $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => {
        const run = chain.then(async () => {
          const tx = {
            $executeRaw: jest.fn().mockResolvedValue(1),
            appointment: {
              findMany: jest.fn(
                async ({
                  where,
                }: {
                  where: {
                    assignedToId?: string;
                    startAt?: { lt?: Date };
                    endAt?: { gt?: Date };
                    OR?: unknown;
                  };
                }) => {
                  const rangeEnd = where.startAt?.lt;
                  const rangeStart = where.endAt?.gt;
                  return rows.filter((row) => {
                    if (row.deletedAt) return false;
                    if (row.assignedToId !== staffId) return false;
                    if (rangeStart && !(row.endAt > rangeStart)) return false;
                    if (rangeEnd && !(row.startAt < rangeEnd)) return false;
                    return true;
                  });
                },
              ),
              create: jest.fn(async ({ data }: { data: { assignedToId: string } }) => {
                const created = {
                  id: `appt-${rows.length + 1}`,
                  businessId,
                  assignedToId: data.assignedToId,
                  startAt,
                  endAt,
                  status: AppointmentStatus.CONFIRMED,
                  deletedAt: null,
                  serviceLines: [],
                  calendar: null,
                  contact: null,
                  service: null,
                  assignedTo: null,
                  createdBy: null,
                  invoices: [],
                  metadata: null,
                };
                rows.push(created);
                return created;
              }),
            },
          };
          return fn(tx);
        });
        chain = run.then(
          () => undefined,
          () => undefined,
        );
        return run;
      }),
    };

    const repository = new AppointmentRepository(prisma as never);

    const attempt = () =>
      repository.runWithStaffSlotLock(businessId, [staffId], async (tx) => {
        const conflicts = await repository.findStaffBlockingInRange(
          businessId,
          null,
          startAt,
          endAt,
          staffId,
          undefined,
          tx,
        );
        if (conflicts.length > 0) {
          throw new AppException(
            ErrorCode.BOOKING_SLOT_UNAVAILABLE,
            'This time slot is no longer available',
            409,
          );
        }
        return repository.create(
          businessId,
          {
            title: 'Botox',
            startAt,
            endAt,
            assignedToId: staffId,
            status: AppointmentStatus.CONFIRMED,
          },
          undefined,
          undefined,
          tx,
        );
      });

    const results = await Promise.allSettled([attempt(), attempt()]);
    const fulfilled = results.filter((row) => row.status === 'fulfilled');
    const rejected = results.filter((row) => row.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rows).toHaveLength(1);
    const reason = (rejected[0] as PromiseRejectedResult).reason as AppException;
    expect(reason).toBeInstanceOf(AppException);
    expect(reason.code).toBe(ErrorCode.BOOKING_SLOT_UNAVAILABLE);
  });
});

describe('acquireStaffSlotLocks', () => {
  it('no-ops when there are no staff ids', async () => {
    const tx = { $executeRaw: jest.fn() };
    await acquireStaffSlotLocks(tx as never, 'biz-1', []);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
});
