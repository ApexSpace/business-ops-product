import {
  AppointmentSource,
  AppointmentStatus,
  BusinessMemberRole,
} from '@prisma/client';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AppointmentsService } from './appointments.service';
import type { AppointmentWithRelations } from '../repositories/appointment.repository';

function owner(): RequestUser {
  return {
    id: 'owner-1',
    email: 'owner@example.com',
    context: 'business',
    businessId: 'biz-1',
    businessRole: BusinessMemberRole.OWNER,
  };
}

function appointmentRow(
  overrides: Partial<AppointmentWithRelations> &
    Pick<AppointmentWithRelations, 'status'>,
): AppointmentWithRelations {
  const now = new Date('2030-01-15T15:00:00.000Z');
  return {
    id: 'appt-1',
    businessId: 'biz-1',
    calendarId: null,
    contactId: 'contact-1',
    serviceId: 'svc-1',
    workItemId: null,
    assignedToId: 'staff-1',
    title: 'Botox',
    description: null,
    startAt: now,
    endAt: new Date(now.getTime() + 60 * 60_000),
    source: AppointmentSource.INTERNAL,
    locationType: null,
    locationValue: null,
    notes: null,
    metadata: null,
    guestFirstName: null,
    guestEmail: null,
    guestPhone: null,
    guestPhoneCountryCode: null,
    expressBookingToken: null,
    expressBookingExpiresAt: null,
    expressBookingCompletedAt: null,
    clientManageToken: null,
    bookedAt: null,
    expressRequireCard: null,
    expressRequireDeposit: null,
    expressTimeLimitMinutes: null,
    externalProvider: null,
    externalEventId: null,
    createdById: 'owner-1',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    calendar: null,
    contact: {
      id: 'contact-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      phoneNumber: null,
      phoneCountryCode: null,
      createdAt: now,
    },
    service: { id: 'svc-1', name: 'Botox' },
    serviceLines: [],
    assignedTo: {
      id: 'staff-1',
      firstName: 'Sam',
      lastName: 'Staff',
      email: 'sam@example.com',
    },
    createdBy: null,
    invoices: [],
    ...overrides,
  };
}

describe('AppointmentsService create + updateStatus', () => {
  const fakeTx = { kind: 'tx' };
  const startAt = '2030-01-15T15:00:00.000Z';
  const endAt = '2030-01-15T16:00:00.000Z';

  let appointmentRepository: {
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    runWithStaffSlotLock: jest.Mock;
    findStaffBlockingInRange: jest.Mock;
  };
  let calendarRepository: { findById: jest.Mock };
  let contactRepository: { findById: jest.Mock };
  let serviceRepository: { findById: jest.Mock };
  let workItemRepository: { findById: jest.Mock };
  let membershipRepository: { findActiveByUserAndBusiness: jest.Mock };
  let auditService: { log: jest.Mock };
  let auditLogRepository: { findMany: jest.Mock };
  let jobEnqueueService: { enqueueAppointmentGoogleSync: jest.Mock };
  let appointmentNotificationService: {
    sendOwnerNotifications: jest.Mock;
    sendStaffNotifications: jest.Mock;
    sendConfirmation: jest.Mock;
    sendCancelled: jest.Mock;
  };
  let clientPackagesService: { findOne: jest.Mock; redeemService: jest.Mock };
  let workingHoursService: {
    resolveAppointmentTimezone: jest.Mock;
    isWithinWorkingHours: jest.Mock;
  };
  let waitlistMatchingService: { recheckOnCalendarMutation: jest.Mock };
  let storageService: { getReadUrl: jest.Mock };
  let waitingRoomSettingsService: { isWaitingStatusEnabled: jest.Mock };
  let cancelRescheduleSettingsService: { getBehaviorSettings: jest.Mock };
  let appointmentAutomatedMessagesService: { ensureBookedSettings: jest.Mock };
  let resourceAllocation: { allocateForCreate: jest.Mock };
  let service: AppointmentsService;

  beforeEach(() => {
    appointmentRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      runWithStaffSlotLock: jest.fn(
        async (
          _businessId: string,
          _staffIds: string[],
          fn: (tx: typeof fakeTx) => Promise<unknown>,
        ) => fn(fakeTx),
      ),
      findStaffBlockingInRange: jest.fn().mockResolvedValue([]),
    };
    calendarRepository = { findById: jest.fn() };
    contactRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'contact-1' }),
    };
    serviceRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 'svc-1',
        durationMinutes: 60,
        hasProcessingTime: false,
        processingDurationMinutes: null,
        finishDurationMinutes: null,
        hasBufferTime: false,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        price: 100,
      }),
    };
    workItemRepository = { findById: jest.fn() };
    membershipRepository = {
      findActiveByUserAndBusiness: jest.fn().mockResolvedValue({ id: 'mem-1' }),
    };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    auditLogRepository = { findMany: jest.fn() };
    jobEnqueueService = {
      enqueueAppointmentGoogleSync: jest.fn().mockResolvedValue(undefined),
    };
    appointmentNotificationService = {
      sendOwnerNotifications: jest.fn().mockResolvedValue(undefined),
      sendStaffNotifications: jest.fn().mockResolvedValue(undefined),
      sendConfirmation: jest.fn().mockResolvedValue(undefined),
      sendCancelled: jest.fn().mockResolvedValue(undefined),
    };
    clientPackagesService = {
      findOne: jest.fn(),
      redeemService: jest.fn(),
    };
    workingHoursService = {
      resolveAppointmentTimezone: jest.fn().mockResolvedValue('UTC'),
      isAppointmentOutsideWorkingHours: jest.fn().mockResolvedValue({
        outside: false,
        label: null,
      }),
    };
    waitlistMatchingService = {
      recheckOnCalendarMutation: jest.fn().mockResolvedValue(undefined),
    };
    storageService = { getReadUrl: jest.fn() };
    waitingRoomSettingsService = {
      isWaitingStatusEnabled: jest.fn().mockResolvedValue(true),
    };
    cancelRescheduleSettingsService = {
      getBehaviorSettings: jest.fn().mockResolvedValue({
        lateCancellationHoursBefore: 24,
      }),
    };
    appointmentAutomatedMessagesService = {
      ensureBookedSettings: jest.fn().mockResolvedValue({
        defaultStatus: AppointmentStatus.CONFIRMED,
        triggers: [],
      }),
    };
    resourceAllocation = {
      allocateForCreate: jest.fn().mockResolvedValue([]),
    };

    service = new AppointmentsService(
      appointmentRepository as never,
      calendarRepository as never,
      contactRepository as never,
      serviceRepository as never,
      workItemRepository as never,
      membershipRepository as never,
      auditService as never,
      auditLogRepository as never,
      jobEnqueueService as never,
      appointmentNotificationService as never,
      clientPackagesService as never,
      workingHoursService as never,
      waitlistMatchingService as never,
      storageService as never,
      waitingRoomSettingsService as never,
      cancelRescheduleSettingsService as never,
      appointmentAutomatedMessagesService as never,
      resourceAllocation as never,
    );
  });

  describe('create (APT-AUD-01 / APT-AUD-14)', () => {
    const dto = {
      contactId: 'contact-1',
      assignedToId: 'staff-1',
      title: 'Botox',
      startAt,
      endAt,
      services: [{ serviceId: 'svc-1' }],
      sendConfirmation: false,
    };

    it('checks conflicts and inserts inside the staff slot lock', async () => {
      const created = appointmentRow({ status: AppointmentStatus.CONFIRMED });
      appointmentRepository.create.mockResolvedValue(created);

      const result = await service.create('biz-1', dto, owner());

      expect(appointmentRepository.runWithStaffSlotLock).toHaveBeenCalledWith(
        'biz-1',
        ['staff-1'],
        expect.any(Function),
      );
      expect(appointmentRepository.findStaffBlockingInRange).toHaveBeenCalledWith(
        'biz-1',
        null,
        expect.any(Date),
        expect.any(Date),
        'staff-1',
        undefined,
        fakeTx,
      );
      expect(appointmentRepository.create).toHaveBeenCalledWith(
        'biz-1',
        expect.objectContaining({
          assignedToId: 'staff-1',
          title: 'Botox',
        }),
        expect.any(Array),
        [],
        fakeTx,
      );
      expect(resourceAllocation.allocateForCreate).toHaveBeenCalled();
      expect(result.status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('rejects overlapping staff windows found inside the lock', async () => {
      appointmentRepository.findStaffBlockingInRange.mockResolvedValue([
        {
          id: 'existing',
          startAt: new Date(startAt),
          endAt: new Date(endAt),
          metadata: null,
        },
      ]);

      await expect(service.create('biz-1', dto, owner())).rejects.toMatchObject({
        code: ErrorCode.APPOINTMENT_SCHEDULE_CONFLICT,
      });
      expect(appointmentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus (APT-AUD-02 / APT-AUD-14)', () => {
    it('allows UNCONFIRMED → CONFIRMED', async () => {
      appointmentRepository.findById.mockResolvedValue(
        appointmentRow({ status: AppointmentStatus.UNCONFIRMED }),
      );
      appointmentRepository.update.mockResolvedValue(
        appointmentRow({ status: AppointmentStatus.CONFIRMED }),
      );

      const result = await service.updateStatus(
        'biz-1',
        'appt-1',
        { status: AppointmentStatus.CONFIRMED },
        owner(),
      );

      expect(appointmentRepository.update).toHaveBeenCalledWith(
        'appt-1',
        expect.objectContaining({ status: AppointmentStatus.CONFIRMED }),
      );
      expect(result.status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('rejects COMPLETED → CONFIRMED', async () => {
      appointmentRepository.findById.mockResolvedValue(
        appointmentRow({ status: AppointmentStatus.COMPLETED }),
      );

      await expect(
        service.updateStatus(
          'biz-1',
          'appt-1',
          { status: AppointmentStatus.CONFIRMED },
          owner(),
        ),
      ).rejects.toMatchObject({
        code: ErrorCode.BAD_REQUEST,
      });
      expect(appointmentRepository.update).not.toHaveBeenCalled();
    });

    it('rejects CANCELLED → IN_SERVICE', async () => {
      appointmentRepository.findById.mockResolvedValue(
        appointmentRow({ status: AppointmentStatus.CANCELLED }),
      );

      await expect(
        service.updateStatus(
          'biz-1',
          'appt-1',
          { status: AppointmentStatus.IN_SERVICE },
          owner(),
        ),
      ).rejects.toMatchObject({
        code: ErrorCode.BAD_REQUEST,
      });
      expect(appointmentRepository.update).not.toHaveBeenCalled();
    });

    it('keeps the waiting-room gate for CONFIRMED → WAITING', async () => {
      appointmentRepository.findById.mockResolvedValue(
        appointmentRow({ status: AppointmentStatus.CONFIRMED }),
      );
      waitingRoomSettingsService.isWaitingStatusEnabled.mockResolvedValue(false);

      await expect(
        service.updateStatus(
          'biz-1',
          'appt-1',
          { status: AppointmentStatus.WAITING },
          owner(),
        ),
      ).rejects.toMatchObject({
        code: ErrorCode.BAD_REQUEST,
      });
      expect(appointmentRepository.update).not.toHaveBeenCalled();
    });
  });
});
