import { HttpStatus } from '@nestjs/common';
import { SchedulingSettingsService } from './scheduling-settings.service';

describe('SchedulingSettingsService', () => {
  const schedulingRow = {
    id: 'sched-1',
    businessId: 'biz-1',
    bufferTimeEnabled: true,
    processingTimeEnabled: true,
    rebookingJumpWeeks: [2, 3, 4, 5, 6, 7],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const onlineBookingRow = {
    id: 'ob-1',
    businessId: 'biz-1',
    slotIntervalMinutes: 15,
    bufferBeforeMinutes: 10,
    bufferAfterMinutes: 5,
  };
  const displayRow = {
    id: 'disp-1',
    businessId: 'biz-1',
    showBufferOnCalendar: false,
  };

  let schedulingRepository: {
    ensureSettings: jest.Mock;
    upsert: jest.Mock;
    toRecord: jest.Mock;
  };
  let onlineBookingRepository: {
    ensureSettings: jest.Mock;
    upsert: jest.Mock;
  };
  let displayRepository: {
    ensureSettings: jest.Mock;
    upsert: jest.Mock;
  };
  let auditService: { log: jest.Mock };
  let service: SchedulingSettingsService;

  beforeEach(() => {
    schedulingRepository = {
      ensureSettings: jest.fn().mockResolvedValue(schedulingRow),
      upsert: jest.fn().mockResolvedValue(schedulingRow),
      toRecord: jest.fn().mockReturnValue({
        ...schedulingRow,
        rebookingJumpWeeksParsed: [2, 3, 4, 5, 6, 7],
      }),
    };
    onlineBookingRepository = {
      ensureSettings: jest.fn().mockResolvedValue(onlineBookingRow),
      upsert: jest.fn().mockResolvedValue({
        ...onlineBookingRow,
        slotIntervalMinutes: 30,
      }),
    };
    displayRepository = {
      ensureSettings: jest.fn().mockResolvedValue(displayRow),
      upsert: jest.fn().mockResolvedValue({
        ...displayRow,
        showBufferOnCalendar: true,
      }),
    };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    service = new SchedulingSettingsService(
      schedulingRepository as never,
      onlineBookingRepository as never,
      displayRepository as never,
      auditService as never,
    );
  });

  it('aggregates scheduling, online booking, and display settings', async () => {
    const result = await service.getSettings('biz-1');

    expect(result).toEqual({
      slotIntervalMinutes: 15,
      bufferTimeEnabled: true,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 5,
      showBufferOnCalendar: false,
      processingTimeEnabled: true,
      rebookingJumpWeeks: [2, 3, 4, 5, 6, 7],
    });
  });

  it('routes PATCH fields to the correct stores', async () => {
    const actor = { id: 'user-1' } as never;

    const result = await service.updateSettings(
      'biz-1',
      {
        slotIntervalMinutes: 30,
        showBufferOnCalendar: true,
        bufferTimeEnabled: false,
        rebookingJumpWeeks: [3, 5, 7],
      },
      actor,
    );

    expect(onlineBookingRepository.upsert).toHaveBeenCalledWith('biz-1', {
      slotIntervalMinutes: 30,
    });
    expect(displayRepository.upsert).toHaveBeenCalledWith('biz-1', {
      showBufferOnCalendar: true,
    });
    expect(schedulingRepository.upsert).toHaveBeenCalledWith('biz-1', {
      bufferTimeEnabled: false,
      rebookingJumpWeeks: [3, 5, 7],
    });
    expect(auditService.log).toHaveBeenCalled();
    expect(result.slotIntervalMinutes).toBe(30);
    expect(result.showBufferOnCalendar).toBe(true);
  });

  it('rejects invalid rebooking jump weeks', async () => {
    await expect(
      service.updateSettings(
        'biz-1',
        { rebookingJumpWeeks: [0, 13] },
        { id: 'user-1' } as never,
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
    });
  });
});
