import { Injectable } from '@nestjs/common';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  UpdateCancelledVisibilityDto,
  UpdateHighContrastDto,
  UpdateVisibleHoursDto,
  UpdateWeekStartDto,
  UpdateZoomLevelDto,
} from '../dto/calendar-display-settings.dto';
import { toCalendarDisplaySettingsResponse } from '../mappers/calendar-display-settings.mapper';
import { CalendarDisplaySettingsRepository } from '../repositories/calendar-display-settings.repository';
import {
  assertValidVisibleHours,
  assertValidWeekStartsOn,
} from '../utils/calendar-display-settings.util';

@Injectable()
export class CalendarDisplaySettingsService {
  constructor(
    private readonly repository: CalendarDisplaySettingsRepository,
    private readonly auditService: AuditService,
  ) {}

  async getSettings(businessId: string) {
    const settings = await this.repository.ensureSettings(businessId);
    return toCalendarDisplaySettingsResponse(settings);
  }

  async updateVisibleHours(
    businessId: string,
    dto: UpdateVisibleHoursDto,
    actor: RequestUser,
  ) {
    assertValidVisibleHours(dto.visibleStartTime, dto.visibleEndTime);
    await this.repository.ensureSettings(businessId);
    const settings = await this.repository.upsert(businessId, {
      visibleStartTime: dto.visibleStartTime.trim(),
      visibleEndTime: dto.visibleEndTime.trim(),
    });
    await this.audit(businessId, actor.id, 'visible-hours');
    return toCalendarDisplaySettingsResponse(settings);
  }

  async updateWeekStart(
    businessId: string,
    dto: UpdateWeekStartDto,
    actor: RequestUser,
  ) {
    assertValidWeekStartsOn(dto.weekStartsOn);
    await this.repository.ensureSettings(businessId);
    const settings = await this.repository.upsert(businessId, {
      weekStartsOn: dto.weekStartsOn,
    });
    await this.audit(businessId, actor.id, 'week-start');
    return toCalendarDisplaySettingsResponse(settings);
  }

  async updateZoomLevel(
    businessId: string,
    dto: UpdateZoomLevelDto,
    actor: RequestUser,
  ) {
    await this.repository.ensureSettings(businessId);
    const settings = await this.repository.upsert(businessId, {
      zoomLevel: dto.zoomLevel,
    });
    await this.audit(businessId, actor.id, 'zoom-level');
    return toCalendarDisplaySettingsResponse(settings);
  }

  async updateCancelledVisibility(
    businessId: string,
    dto: UpdateCancelledVisibilityDto,
    actor: RequestUser,
  ) {
    await this.repository.ensureSettings(businessId);
    const settings = await this.repository.upsert(businessId, {
      showNormalCancellation: dto.showNormalCancellation,
      showLateCancellation: dto.showLateCancellation,
      showNoShow: dto.showNoShow,
    });
    await this.audit(businessId, actor.id, 'cancelled-visibility');
    return toCalendarDisplaySettingsResponse(settings);
  }

  async updateHighContrast(
    businessId: string,
    dto: UpdateHighContrastDto,
    actor: RequestUser,
  ) {
    await this.repository.ensureSettings(businessId);
    const settings = await this.repository.upsert(businessId, {
      highContrastEnabled: dto.highContrastEnabled,
    });
    await this.audit(businessId, actor.id, 'high-contrast');
    return toCalendarDisplaySettingsResponse(settings);
  }

  private async audit(
    businessId: string,
    actorUserId: string,
    section: string,
  ): Promise<void> {
    await this.auditService.log({
      actorUserId,
      businessId,
      action: 'calendar_display_settings.updated',
      entityType: 'BusinessCalendarDisplaySettings',
      entityId: businessId,
      metadata: { section },
    });
  }
}
