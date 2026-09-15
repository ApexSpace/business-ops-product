import { Injectable } from '@nestjs/common';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  UpdateWaitingRoomSettingsDto,
  WaitingRoomSettingsResponseDto,
} from '../dto/waiting-room-settings.dto';
import { toWaitingRoomSettingsResponse } from '../mappers/waiting-room-settings.mapper';
import { WaitingRoomSettingsRepository } from '../repositories/waiting-room-settings.repository';

@Injectable()
export class WaitingRoomSettingsService {
  constructor(
    private readonly repository: WaitingRoomSettingsRepository,
    private readonly auditService: AuditService,
  ) {}

  async getSettings(businessId: string): Promise<WaitingRoomSettingsResponseDto> {
    const settings = await this.repository.ensureSettings(businessId);
    return toWaitingRoomSettingsResponse(settings);
  }

  async updateSettings(
    businessId: string,
    dto: UpdateWaitingRoomSettingsDto,
    actor: RequestUser,
  ): Promise<WaitingRoomSettingsResponseDto> {
    await this.repository.ensureSettings(businessId);
    const settings = await this.repository.upsert(businessId, {
      ...(dto.waitingStatusEnabled !== undefined
        ? { waitingStatusEnabled: dto.waitingStatusEnabled }
        : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'waiting_room_settings.updated',
      entityType: 'BusinessWaitingRoomSettings',
      entityId: settings.id,
    });

    return toWaitingRoomSettingsResponse(settings);
  }

  async isWaitingStatusEnabled(businessId: string): Promise<boolean> {
    const settings = await this.repository.ensureSettings(businessId);
    return settings.waitingStatusEnabled;
  }
}
