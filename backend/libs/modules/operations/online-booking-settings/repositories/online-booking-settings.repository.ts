import { Injectable } from '@nestjs/common';
import {
  BusinessHourException,
  BusinessHours,
  BusinessOnlineBookingSettings,
  Prisma,
  StaffWorkException,
  StaffWorkSchedule,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

export type BusinessBookingContext = BusinessOnlineBookingSettings & {
  business: {
    id: string;
    name: string;
    settings: Prisma.JsonValue;
    timezone: string | null;
    businessHours: BusinessHours[];
    businessHourExceptions: BusinessHourException[];
  };
};

@Injectable()
export class OnlineBookingSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private bookingContextInclude = {
    business: {
      select: {
        id: true,
        name: true,
        settings: true,
        timezone: true,
        businessHours: true,
        businessHourExceptions: true,
      },
    },
  } satisfies Prisma.BusinessOnlineBookingSettingsInclude;

  findByBusinessId(
    businessId: string,
  ): Promise<BusinessOnlineBookingSettings | null> {
    return this.prisma.businessOnlineBookingSettings.findUnique({
      where: { businessId },
    });
  }

  findByPublicSlug(publicSlug: string): Promise<BusinessBookingContext | null> {
    return this.prisma.businessOnlineBookingSettings.findFirst({
      where: { publicSlug },
      include: this.bookingContextInclude,
    });
  }

  findBookingContextByBusinessId(
    businessId: string,
  ): Promise<BusinessBookingContext | null> {
    return this.prisma.businessOnlineBookingSettings.findUnique({
      where: { businessId },
      include: this.bookingContextInclude,
    });
  }

  upsert(
    businessId: string,
    data: Prisma.BusinessOnlineBookingSettingsUpdateInput,
  ): Promise<BusinessOnlineBookingSettings> {
    return this.prisma.businessOnlineBookingSettings.upsert({
      where: { businessId },
      create: {
        ...(data as Prisma.BusinessOnlineBookingSettingsUncheckedCreateInput),
        businessId,
      },
      update: data,
    });
  }

  ensureSettings(businessId: string): Promise<BusinessOnlineBookingSettings> {
    return this.prisma.businessOnlineBookingSettings.upsert({
      where: { businessId },
      create: { businessId },
      update: {},
    });
  }

  isSlugTaken(slug: string, excludeBusinessId?: string): Promise<boolean> {
    return this.prisma.businessOnlineBookingSettings
      .findFirst({
        where: {
          publicSlug: slug,
          ...(excludeBusinessId
            ? { businessId: { not: excludeBusinessId } }
            : {}),
        },
        select: { id: true },
      })
      .then(Boolean);
  }

  replaceBusinessHours(
    businessId: string,
    rows: Array<{
      dayOfWeek: BusinessHours['dayOfWeek'];
      startTime: string;
      endTime: string;
      isEnabled: boolean;
    }>,
  ): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      await tx.businessHours.deleteMany({ where: { businessId } });
      if (rows.length > 0) {
        await tx.businessHours.createMany({
          data: rows.map((row) => ({ businessId, ...row })),
        });
      }
    });
  }

  findStaffSchedules(
    businessId: string,
    userId: string,
  ): Promise<StaffWorkSchedule[]> {
    return this.prisma.staffWorkSchedule.findMany({
      where: { businessId, userId },
    });
  }

  findStaffExceptions(
    businessId: string,
    userId: string,
    from: Date,
    to: Date,
  ): Promise<StaffWorkException[]> {
    return this.prisma.staffWorkException.findMany({
      where: {
        businessId,
        userId,
        date: { gte: from, lte: to },
      },
    });
  }

  replaceStaffSchedules(
    businessId: string,
    userId: string,
    rows: Array<{
      dayOfWeek: StaffWorkSchedule['dayOfWeek'];
      startTime: string;
      endTime: string;
      isEnabled: boolean;
    }>,
  ): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      await tx.staffWorkSchedule.deleteMany({ where: { businessId, userId } });
      if (rows.length > 0) {
        await tx.staffWorkSchedule.createMany({
          data: rows.map((row) => ({ businessId, userId, ...row })),
        });
      }
    });
  }
}
