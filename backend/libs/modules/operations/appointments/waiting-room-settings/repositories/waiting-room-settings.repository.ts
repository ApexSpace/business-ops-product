import { Injectable } from '@nestjs/common';
import { BusinessWaitingRoomSettings, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class WaitingRoomSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByBusinessId(
    businessId: string,
  ): Promise<BusinessWaitingRoomSettings | null> {
    return this.prisma.businessWaitingRoomSettings.findUnique({
      where: { businessId },
    });
  }

  ensureSettings(businessId: string): Promise<BusinessWaitingRoomSettings> {
    return this.prisma.businessWaitingRoomSettings.upsert({
      where: { businessId },
      create: {
        businessId,
        waitingStatusEnabled: true,
      },
      update: {},
    });
  }

  upsert(
    businessId: string,
    data: Prisma.BusinessWaitingRoomSettingsUpdateInput,
  ): Promise<BusinessWaitingRoomSettings> {
    return this.prisma.businessWaitingRoomSettings.update({
      where: { businessId },
      data,
    });
  }
}
