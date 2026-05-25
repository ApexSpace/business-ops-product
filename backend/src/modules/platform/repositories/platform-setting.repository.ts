import { Injectable } from '@nestjs/common';
import { PlatformSetting, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

export const PLATFORM_SETTINGS_KEY = 'general';

export interface PlatformSettingsValue {
  platformName: string;
  supportEmail: string;
  defaultTrialDays: number;
  maintenanceMode: boolean;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsValue = {
  platformName: 'CodeSol Platform',
  supportEmail: 'support@codesol.com',
  defaultTrialDays: 14,
  maintenanceMode: false,
};

@Injectable()
export class PlatformSettingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<PlatformSettingsValue> {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key: PLATFORM_SETTINGS_KEY },
    });
    if (!row) {
      return DEFAULT_PLATFORM_SETTINGS;
    }
    return row.value as unknown as PlatformSettingsValue;
  }

  async upsertSettings(
    value: PlatformSettingsValue,
  ): Promise<PlatformSetting> {
    return this.prisma.platformSetting.upsert({
      where: { key: PLATFORM_SETTINGS_KEY },
      create: {
        key: PLATFORM_SETTINGS_KEY,
        value: value as unknown as Prisma.InputJsonValue,
      },
      update: {
        value: value as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
