import { MembershipStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { QuickToolsService } from './quick-tools.service';

describe('QuickToolsService', () => {
  const businessId = 'biz-1';
  const staffId = 'staff-1';
  const actor = { id: 'user-1', businessId } as never;

  let service: QuickToolsService;
  let staffWorkExceptionRepository: {
    findByStaffIdsInRange: jest.Mock;
    bulkUpsertFullDayUnavailable: jest.Mock;
    countFullDayUnavailableInRange: jest.Mock;
    bulkDeleteFullDayUnavailable: jest.Mock;
  };
  let membershipRepository: { findActiveByUserAndBusiness: jest.Mock };
  let businessRepository: { findById: jest.Mock };
  let prisma: { appointment: { findMany: jest.Mock } };
  let auditService: { log: jest.Mock };

  beforeEach(() => {
    staffWorkExceptionRepository = {
      findByStaffIdsInRange: jest.fn().mockResolvedValue([]),
      bulkUpsertFullDayUnavailable: jest.fn().mockResolvedValue(2),
      countFullDayUnavailableInRange: jest.fn().mockResolvedValue(1),
      bulkDeleteFullDayUnavailable: jest.fn().mockResolvedValue(1),
    };
    membershipRepository = {
      findActiveByUserAndBusiness: jest.fn().mockResolvedValue({
        isServiceProvider: true,
        status: MembershipStatus.ACTIVE,
      }),
    };
    businessRepository = {
      findById: jest.fn().mockResolvedValue({ timezone: 'UTC' }),
    };
    prisma = {
      appointment: { findMany: jest.fn().mockResolvedValue([]) },
    };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    service = new QuickToolsService(
      staffWorkExceptionRepository as never,
      membershipRepository as never,
      businessRepository as never,
      prisma as never,
      auditService as never,
    );
  });

  const baseDto = {
    staffUserIds: [staffId],
    fromDate: '2026-09-02',
    toDate: '2026-09-03',
  };

  it('previews set-not-working with day count', async () => {
    const result = await service.previewSetNotWorking(businessId, baseDto);
    expect(result.daysAffected).toBe(2);
    expect(result.exceptionsToCreate).toBe(2);
    expect(result.skipped).toEqual([]);
  });

  it('skips partial-day exceptions on set preview', async () => {
    staffWorkExceptionRepository.findByStaffIdsInRange.mockResolvedValue([
      {
        userId: staffId,
        date: new Date('2026-09-02T00:00:00.000Z'),
        startTime: '09:00',
        endTime: '12:00',
        isUnavailable: true,
      },
    ]);

    const result = await service.previewSetNotWorking(businessId, {
      ...baseDto,
      toDate: '2026-09-02',
    });
    expect(result.exceptionsToCreate).toBe(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]?.reason).toBe('partial_day_exists');
  });

  it('rejects non-service-provider staff', async () => {
    membershipRepository.findActiveByUserAndBusiness.mockResolvedValue({
      isServiceProvider: false,
      status: MembershipStatus.ACTIVE,
    });

    await expect(
      service.previewSetNotWorking(businessId, baseDto),
    ).rejects.toBeInstanceOf(AppException);
  });

  it('applies set-not-working and audits', async () => {
    const result = await service.applySetNotWorking(businessId, baseDto, actor);
    expect(result.exceptionsCreated).toBe(2);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'quick_tools.set_not_working' }),
    );
  });

  it('previews remove-not-working counts', async () => {
    const result = await service.previewRemoveNotWorking(businessId, baseDto);
    expect(result.exceptionsToRemove).toBe(1);
    expect(result.daysAffected).toBe(2);
  });

  it('applies remove-not-working and audits', async () => {
    const result = await service.applyRemoveNotWorking(
      businessId,
      baseDto,
      actor,
    );
    expect(result.exceptionsRemoved).toBe(1);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'quick_tools.remove_not_working' }),
    );
  });

  it('includes appointment counts in preview', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      {
        assignedToId: staffId,
        serviceLines: [],
      },
    ]);

    const result = await service.previewSetNotWorking(businessId, baseDto);
    expect(result.appointmentCount).toBe(1);
    expect(result.appointmentsByStaff[0]?.count).toBe(1);
  });
});
