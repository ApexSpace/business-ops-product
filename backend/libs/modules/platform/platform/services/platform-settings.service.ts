import { Injectable } from '@nestjs/common';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  DEFAULT_PLATFORM_SETTINGS,
  PlatformSettingRepository,
  PlatformSettingsValue,
} from '../repositories/platform-setting.repository';
import { UpdatePlatformSettingsDto } from '../dto/platform-settings.dto';

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly platformSettingRepository: PlatformSettingRepository,
    private readonly auditService: AuditService,
  ) {}

  async get(): Promise<PlatformSettingsValue> {
    return this.platformSettingRepository.getSettings();
  }

  async update(
    dto: UpdatePlatformSettingsDto,
    actor: RequestUser,
  ): Promise<PlatformSettingsValue> {
    const current =
      (await this.platformSettingRepository.getSettings()) ??
      DEFAULT_PLATFORM_SETTINGS;

    const next: PlatformSettingsValue = {
      platformName: dto.platformName ?? current.platformName,
      supportEmail: dto.supportEmail ?? current.supportEmail,
      defaultTrialDays: dto.defaultTrialDays ?? current.defaultTrialDays,
      maintenanceMode: dto.maintenanceMode ?? current.maintenanceMode,
    };

    await this.platformSettingRepository.upsertSettings(next);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.settings.updated',
      entityType: 'PlatformSetting',
      entityId: 'general',
      metadata: { changes: dto },
    });

    return next;
  }
}
