import { Injectable } from '@nestjs/common';
import {
  BusinessNotificationChannelPreference,
  NotificationChannel,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class NotificationChannelPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByBusiness(
    businessId: string,
  ): Promise<BusinessNotificationChannelPreference[]> {
    return this.prisma.businessNotificationChannelPreference.findMany({
      where: { businessId },
      orderBy: { notificationKey: 'asc' },
    });
  }

  findByBusinessAndKey(
    businessId: string,
    notificationKey: string,
  ): Promise<BusinessNotificationChannelPreference | null> {
    return this.prisma.businessNotificationChannelPreference.findUnique({
      where: {
        businessId_notificationKey: { businessId, notificationKey },
      },
    });
  }

  upsert(
    businessId: string,
    notificationKey: string,
    channel: NotificationChannel,
  ): Promise<BusinessNotificationChannelPreference> {
    return this.prisma.businessNotificationChannelPreference.upsert({
      where: {
        businessId_notificationKey: { businessId, notificationKey },
      },
      create: { businessId, notificationKey, channel },
      update: { channel },
    });
  }
}
