import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { CalendarDisplaySettingsRepository } from '@app/modules/operations/calendars/display-settings/repositories/calendar-display-settings.repository';
import { OnlineBookingSettingsRepository } from '@app/modules/operations/online-booking-settings/repositories/online-booking-settings.repository';
import {
  SchedulingSettingsResponseDto,
  UpdateSchedulingSettingsDto,
} from '../dto/scheduling-settings.dto';
import { SchedulingSettingsRepository } from '../repositories/scheduling-settings.repository';
import {
  assertValidRebookingJumpWeeks,
  parseRebookingJumpWeeks,
} from '../utils/scheduling-behavior.util';

@Injectable()
export class SchedulingSettingsService {
  constructor(
    private readonly schedulingRepository: SchedulingSettingsRepository,
    private readonly onlineBookingRepository: OnlineBookingSettingsRepository,
    private readonly displayRepository: CalendarDisplaySettingsRepository,
    private readonly auditService: AuditService,
  ) {}

  async getSettings(businessId: string): Promise<SchedulingSettingsResponseDto> {
    const [scheduling, onlineBooking, display] = await Promise.all([
      this.schedulingRepository.ensureSettings(businessId),
      this.onlineBookingRepository.ensureSettings(businessId),
      this.displayRepository.ensureSettings(businessId),
    ]);

    return this.toResponse(scheduling, onlineBooking, display);
  }

  async updateSettings(
    businessId: string,
    dto: UpdateSchedulingSettingsDto,
    actor: RequestUser,
  ): Promise<SchedulingSettingsResponseDto> {
    const hasOnlineBookingFields =
      dto.slotIntervalMinutes !== undefined ||
      dto.bufferBeforeMinutes !== undefined ||
      dto.bufferAfterMinutes !== undefined;

    const hasDisplayField = dto.showBufferOnCalendar !== undefined;

    const hasSchedulingFields =
      dto.bufferTimeEnabled !== undefined ||
      dto.processingTimeEnabled !== undefined ||
      dto.rebookingJumpWeeks !== undefined;

    if (dto.rebookingJumpWeeks !== undefined) {
      const normalized = [...new Set(dto.rebookingJumpWeeks)].sort(
        (a, b) => a - b,
      );
      try {
        assertValidRebookingJumpWeeks(normalized);
      } catch (err) {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          err instanceof Error ? err.message : 'Invalid rebooking jump weeks',
          HttpStatus.BAD_REQUEST,
        );
      }
      dto.rebookingJumpWeeks = normalized;
    }

    const [onlineBooking, display, scheduling] = await Promise.all([
      hasOnlineBookingFields
        ? this.onlineBookingRepository.ensureSettings(businessId).then(() =>
            this.onlineBookingRepository.upsert(businessId, {
              ...(dto.slotIntervalMinutes !== undefined
                ? { slotIntervalMinutes: dto.slotIntervalMinutes }
                : {}),
              ...(dto.bufferBeforeMinutes !== undefined
                ? { bufferBeforeMinutes: dto.bufferBeforeMinutes }
                : {}),
              ...(dto.bufferAfterMinutes !== undefined
                ? { bufferAfterMinutes: dto.bufferAfterMinutes }
                : {}),
            }),
          )
        : this.onlineBookingRepository.ensureSettings(businessId),
      hasDisplayField
        ? this.displayRepository.ensureSettings(businessId).then(() =>
            this.displayRepository.upsert(businessId, {
              showBufferOnCalendar: dto.showBufferOnCalendar,
            }),
          )
        : this.displayRepository.ensureSettings(businessId),
      hasSchedulingFields
        ? this.schedulingRepository.ensureSettings(businessId).then(() =>
            this.schedulingRepository.upsert(businessId, {
              ...(dto.bufferTimeEnabled !== undefined
                ? { bufferTimeEnabled: dto.bufferTimeEnabled }
                : {}),
              ...(dto.processingTimeEnabled !== undefined
                ? { processingTimeEnabled: dto.processingTimeEnabled }
                : {}),
              ...(dto.rebookingJumpWeeks !== undefined
                ? { rebookingJumpWeeks: dto.rebookingJumpWeeks }
                : {}),
            }),
          )
        : this.schedulingRepository.ensureSettings(businessId),
    ]);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'scheduling_settings.updated',
      entityType: 'BusinessSchedulingSettings',
      entityId: scheduling.id,
    });

    return this.toResponse(scheduling, onlineBooking, display);
  }

  async getFeatureFlags(businessId: string) {
    const settings = await this.schedulingRepository.ensureSettings(businessId);
    return this.schedulingRepository.toRecord(settings);
  }

  async getRuntimeContext(businessId: string) {
    const [scheduling, onlineBooking] = await Promise.all([
      this.schedulingRepository.ensureSettings(businessId),
      this.onlineBookingRepository.ensureSettings(businessId),
    ]);
    return {
      bufferTimeEnabled: scheduling.bufferTimeEnabled,
      processingTimeEnabled: scheduling.processingTimeEnabled,
      businessFallback: {
        bufferBeforeMinutes: onlineBooking.bufferBeforeMinutes,
        bufferAfterMinutes: onlineBooking.bufferAfterMinutes,
      },
    };
  }

  private toResponse(
    scheduling: Awaited<
      ReturnType<SchedulingSettingsRepository['ensureSettings']>
    >,
    onlineBooking: Awaited<
      ReturnType<OnlineBookingSettingsRepository['ensureSettings']>
    >,
    display: Awaited<
      ReturnType<CalendarDisplaySettingsRepository['ensureSettings']>
    >,
  ): SchedulingSettingsResponseDto {
    return {
      slotIntervalMinutes: onlineBooking.slotIntervalMinutes,
      bufferTimeEnabled: scheduling.bufferTimeEnabled,
      bufferBeforeMinutes: onlineBooking.bufferBeforeMinutes,
      bufferAfterMinutes: onlineBooking.bufferAfterMinutes,
      showBufferOnCalendar: display.showBufferOnCalendar,
      processingTimeEnabled: scheduling.processingTimeEnabled,
      rebookingJumpWeeks: parseRebookingJumpWeeks(scheduling.rebookingJumpWeeks),
    };
  }
}
