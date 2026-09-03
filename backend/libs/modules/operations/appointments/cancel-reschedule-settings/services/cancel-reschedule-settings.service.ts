import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CancelRescheduleSettingsResponseDto,
  UpdateCancellationPolicyDto,
  UpdateLateCancellationDto,
  UpdateSelfServiceSettingsDto,
} from '../dto/cancel-reschedule-settings.dto';
import { toCancelRescheduleSettingsResponse } from '../mappers/cancel-reschedule-settings.mapper';
import { CancelRescheduleSettingsRepository } from '../repositories/cancel-reschedule-settings.repository';
import {
  assertValidGraceMinutes,
  assertValidHoursBefore,
  DEFAULT_ONLINE_BOOKING_GRACE_MINUTES,
} from '../utils/cancel-reschedule-behavior.util';

@Injectable()
export class CancelRescheduleSettingsService {
  constructor(
    private readonly repository: CancelRescheduleSettingsRepository,
    private readonly auditService: AuditService,
  ) {}

  async getSettings(
    businessId: string,
  ): Promise<CancelRescheduleSettingsResponseDto> {
    const settings = await this.repository.ensureSettings(businessId);
    return toCancelRescheduleSettingsResponse(settings);
  }

  async getBehaviorSettings(businessId: string) {
    const settings = await this.repository.ensureSettings(businessId);
    return settings;
  }

  async updateCancellationPolicy(
    businessId: string,
    dto: UpdateCancellationPolicyDto,
    actor: RequestUser,
  ): Promise<CancelRescheduleSettingsResponseDto> {
    if (
      dto.cancellationPolicySms != null &&
      dto.cancellationPolicySms.length > 215
    ) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'SMS policy must be 215 characters or fewer',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.repository.ensureSettings(businessId);
    const settings = await this.repository.upsert(businessId, {
      ...(dto.cancellationPolicyHtml !== undefined
        ? { cancellationPolicyHtml: dto.cancellationPolicyHtml }
        : {}),
      ...(dto.cancellationPolicySms !== undefined
        ? { cancellationPolicySms: dto.cancellationPolicySms }
        : {}),
      ...(dto.requirePolicyAgreement !== undefined
        ? { requirePolicyAgreement: dto.requirePolicyAgreement }
        : {}),
    });

    await this.audit(businessId, actor.id, settings.id, 'cancellation-policy');
    return toCancelRescheduleSettingsResponse(settings);
  }

  async updateSelfService(
    businessId: string,
    dto: UpdateSelfServiceSettingsDto,
    actor: RequestUser,
  ): Promise<CancelRescheduleSettingsResponseDto> {
    try {
      if (dto.selfCancellationHoursBefore !== undefined) {
        assertValidHoursBefore(dto.selfCancellationHoursBefore);
      }
      if (dto.selfRescheduleHoursBefore !== undefined) {
        assertValidHoursBefore(dto.selfRescheduleHoursBefore);
      }
      if (dto.selfCancellationMinutes !== undefined) {
        assertValidGraceMinutes(dto.selfCancellationMinutes);
      }
    } catch (err) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        err instanceof Error ? err.message : 'Invalid self-service settings',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.repository.ensureSettings(businessId);
    const settings = await this.repository.upsert(businessId, {
      selfCancellationMode: dto.selfCancellationMode,
      selfRescheduleMode: dto.selfRescheduleMode,
      ...(dto.selfCancellationMinutes !== undefined
        ? { selfCancellationMinutes: dto.selfCancellationMinutes }
        : {}),
      ...(dto.selfCancellationHoursBefore !== undefined
        ? { selfCancellationHoursBefore: dto.selfCancellationHoursBefore }
        : {}),
      ...(dto.selfRescheduleHoursBefore !== undefined
        ? { selfRescheduleHoursBefore: dto.selfRescheduleHoursBefore }
        : {}),
    });

    await this.audit(businessId, actor.id, settings.id, 'self-service');
    return toCancelRescheduleSettingsResponse(settings);
  }

  async updateLateCancellation(
    businessId: string,
    dto: UpdateLateCancellationDto,
    actor: RequestUser,
  ): Promise<CancelRescheduleSettingsResponseDto> {
    try {
      assertValidHoursBefore(dto.lateCancellationHoursBefore);
    } catch (err) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        err instanceof Error ? err.message : 'Invalid late cancellation hours',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.repository.ensureSettings(businessId);
    const settings = await this.repository.upsert(businessId, {
      lateCancellationHoursBefore: dto.lateCancellationHoursBefore,
    });

    await this.audit(businessId, actor.id, settings.id, 'late-cancellation');
    return toCancelRescheduleSettingsResponse(settings);
  }

  private async audit(
    businessId: string,
    actorUserId: string,
    entityId: string,
    section: string,
  ) {
    await this.auditService.log({
      actorUserId,
      businessId,
      action: 'cancel_reschedule_settings.updated',
      entityType: 'BusinessCancelRescheduleSettings',
      entityId,
      metadata: { section },
    });
  }
}
