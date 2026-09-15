import { Injectable } from '@nestjs/common';
import {
  BusinessSchedulingSettings,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  DEFAULT_REBOOKING_JUMP_WEEKS,
  parseRebookingJumpWeeks,
} from '../utils/scheduling-behavior.util';

export type SchedulingSettingsRecord = BusinessSchedulingSettings & {
  rebookingJumpWeeksParsed: number[];
};

@Injectable()
export class SchedulingSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByBusinessId(
    businessId: string,
  ): Promise<BusinessSchedulingSettings | null> {
    return this.prisma.businessSchedulingSettings.findUnique({
      where: { businessId },
    });
  }

  ensureSettings(businessId: string): Promise<BusinessSchedulingSettings> {
    return this.prisma.businessSchedulingSettings.upsert({
      where: { businessId },
      create: {
        businessId,
        bufferTimeEnabled: true,
        processingTimeEnabled: true,
        rebookingJumpWeeks: [...DEFAULT_REBOOKING_JUMP_WEEKS],
      },
      update: {},
    });
  }

  upsert(
    businessId: string,
    data: Prisma.BusinessSchedulingSettingsUpdateInput,
  ): Promise<BusinessSchedulingSettings> {
    return this.prisma.businessSchedulingSettings.upsert({
      where: { businessId },
      create: {
        businessId,
        bufferTimeEnabled:
          typeof data.bufferTimeEnabled === 'boolean'
            ? data.bufferTimeEnabled
            : true,
        processingTimeEnabled:
          typeof data.processingTimeEnabled === 'boolean'
            ? data.processingTimeEnabled
            : true,
        rebookingJumpWeeks:
          data.rebookingJumpWeeks ?? [...DEFAULT_REBOOKING_JUMP_WEEKS],
      },
      update: data,
    });
  }

  toRecord(settings: BusinessSchedulingSettings): SchedulingSettingsRecord {
    return {
      ...settings,
      rebookingJumpWeeksParsed: parseRebookingJumpWeeks(
        settings.rebookingJumpWeeks,
      ),
    };
  }
}
