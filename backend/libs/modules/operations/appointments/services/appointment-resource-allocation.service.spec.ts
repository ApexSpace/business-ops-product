import { HttpStatus } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  AppointmentResourceAllocationService,
  RESOURCE_SCHEDULE_CONFLICT_MESSAGE,
  RESOURCE_UNFULFILLABLE_MESSAGE,
} from './appointment-resource-allocation.service';

describe('AppointmentResourceAllocationService', () => {
  const businessId = 'biz-1';
  const startAt = new Date('2026-09-14T15:00:00.000Z');
  const line = {
    serviceId: 'svc-1',
    startAt,
    durationMinutes: 60,
  };

  const requirement = {
    serviceId: 'svc-1',
    selectionMode: 'SPECIFIC',
    groupId: 'group-rooms',
    resourceId: null,
    quantity: 1,
    items: [{ resourceId: 'room-a' }],
  };

  const activeRoom = {
    id: 'room-a',
    groupId: 'group-rooms',
    status: 'ACTIVE',
    deletedAt: null,
    capacity: 1,
  };

  let prisma: {
    serviceResourceRequirement: { findMany: jest.Mock };
    resource: { findMany: jest.Mock };
    service: { findMany: jest.Mock };
  };
  let appointmentRepository: { findResourceBlockingInRange: jest.Mock };
  let service: AppointmentResourceAllocationService;

  beforeEach(() => {
    prisma = {
      serviceResourceRequirement: {
        findMany: jest.fn().mockResolvedValue([requirement]),
      },
      resource: {
        findMany: jest.fn().mockResolvedValue([activeRoom]),
      },
      service: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'svc-1',
            durationMinutes: 60,
            hasProcessingTime: false,
            processingDurationMinutes: 0,
            finishDurationMinutes: null,
            hasBufferTime: false,
            bufferBeforeMinutes: 0,
            bufferAfterMinutes: 0,
          },
        ]),
      },
    };
    appointmentRepository = {
      findResourceBlockingInRange: jest.fn().mockResolvedValue([]),
    };
    service = new AppointmentResourceAllocationService(
      prisma as never,
      appointmentRepository as never,
    );
  });

  it('returns no assignments when the service has no requirements', async () => {
    prisma.serviceResourceRequirement.findMany.mockResolvedValue([]);

    await expect(
      service.allocateForCreate({
        businessId,
        lines: [line],
        conflictCode: ErrorCode.APPOINTMENT_SCHEDULE_CONFLICT,
      }),
    ).resolves.toEqual([]);

    expect(appointmentRepository.findResourceBlockingInRange).not.toHaveBeenCalled();
  });

  it('allocates a free SPECIFIC resource', async () => {
    const assignments = await service.allocateForCreate({
      businessId,
      lines: [line],
      conflictCode: ErrorCode.APPOINTMENT_SCHEDULE_CONFLICT,
    });

    expect(assignments).toEqual([{ resourceId: 'room-a', quantity: 1 }]);
    expect(appointmentRepository.findResourceBlockingInRange).toHaveBeenCalledWith(
      businessId,
      'room-a',
      startAt,
      new Date('2026-09-14T16:00:00.000Z'),
      undefined,
    );
  });

  it('allocates every active group member for ALL requirements', async () => {
    prisma.serviceResourceRequirement.findMany.mockResolvedValue([
      {
        serviceId: 'svc-1',
        selectionMode: 'ALL',
        groupId: 'group-rooms',
        resourceId: null,
        quantity: 1,
        items: [],
      },
    ]);
    prisma.resource.findMany.mockResolvedValue([
      activeRoom,
      {
        id: 'room-b',
        groupId: 'group-rooms',
        status: 'ACTIVE',
        deletedAt: null,
        capacity: 1,
      },
    ]);

    const assignments = await service.allocateForCreate({
      businessId,
      lines: [line],
      conflictCode: ErrorCode.APPOINTMENT_SCHEDULE_CONFLICT,
    });

    expect(assignments).toEqual([
      { resourceId: 'room-a', quantity: 1 },
      { resourceId: 'room-b', quantity: 1 },
    ]);
  });

  it('writes one assignment when two lines need the same resource', async () => {
    prisma.serviceResourceRequirement.findMany.mockResolvedValue([
      requirement,
      { ...requirement, serviceId: 'svc-2' },
    ]);
    prisma.service.findMany.mockResolvedValue([
      {
        id: 'svc-1',
        durationMinutes: 30,
        hasProcessingTime: false,
        processingDurationMinutes: 0,
        finishDurationMinutes: null,
        hasBufferTime: false,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
      },
      {
        id: 'svc-2',
        durationMinutes: 30,
        hasProcessingTime: false,
        processingDurationMinutes: 0,
        finishDurationMinutes: null,
        hasBufferTime: false,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
      },
    ]);

    const assignments = await service.allocateForCreate({
      businessId,
      lines: [
        line,
        {
          serviceId: 'svc-2',
          startAt: new Date('2026-09-14T16:00:00.000Z'),
          durationMinutes: 30,
        },
      ],
      conflictCode: ErrorCode.APPOINTMENT_SCHEDULE_CONFLICT,
    });

    expect(assignments).toEqual([{ resourceId: 'room-a', quantity: 1 }]);
  });

  it('throws 409 APPOINTMENT_SCHEDULE_CONFLICT when the resource is busy', async () => {
    appointmentRepository.findResourceBlockingInRange.mockResolvedValue([
      {
        id: 'appt-existing',
        startAt,
        endAt: new Date('2026-09-14T16:00:00.000Z'),
        metadata: null,
        usedQuantity: 1,
      },
    ]);

    try {
      await service.allocateForCreate({
        businessId,
        lines: [line],
        conflictCode: ErrorCode.APPOINTMENT_SCHEDULE_CONFLICT,
      });
      throw new Error('expected AppException');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      const exception = error as AppException;
      expect(exception.code).toBe(ErrorCode.APPOINTMENT_SCHEDULE_CONFLICT);
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.message).toContain(RESOURCE_SCHEDULE_CONFLICT_MESSAGE);
    }
  });

  it('throws 409 BOOKING_SLOT_UNAVAILABLE on the public create path', async () => {
    appointmentRepository.findResourceBlockingInRange.mockResolvedValue([
      {
        id: 'appt-existing',
        startAt,
        endAt: new Date('2026-09-14T16:00:00.000Z'),
        metadata: null,
        usedQuantity: 1,
      },
    ]);

    try {
      await service.allocateForCreate({
        businessId,
        lines: [line],
        conflictCode: ErrorCode.BOOKING_SLOT_UNAVAILABLE,
      });
      throw new Error('expected AppException');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      const exception = error as AppException;
      expect(exception.code).toBe(ErrorCode.BOOKING_SLOT_UNAVAILABLE);
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
    }
  });

  it('throws 409 when a required resource cannot be fulfilled', async () => {
    prisma.resource.findMany.mockResolvedValue([
      { ...activeRoom, status: 'INACTIVE' },
    ]);

    try {
      await service.allocateForCreate({
        businessId,
        lines: [line],
        conflictCode: ErrorCode.APPOINTMENT_SCHEDULE_CONFLICT,
      });
      throw new Error('expected AppException');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      const exception = error as AppException;
      expect(exception.code).toBe(ErrorCode.APPOINTMENT_SCHEDULE_CONFLICT);
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.message).toContain(RESOURCE_UNFULFILLABLE_MESSAGE);
    }
  });
});
