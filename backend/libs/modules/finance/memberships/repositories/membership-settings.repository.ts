import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class MembershipSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByBusinessId(businessId: string) {
    return this.prisma.membershipSettings.findUnique({
      where: { businessId },
    });
  }

  upsert(
    businessId: string,
    data: Partial<{
      allowClientCancel: boolean;
      onlineSalesEnabled: boolean;
      publicSlug: string;
    }>,
  ) {
    return this.prisma.membershipSettings.upsert({
      where: { businessId },
      create: {
        businessId,
        allowClientCancel: data.allowClientCancel ?? true,
        onlineSalesEnabled: data.onlineSalesEnabled ?? false,
        publicSlug: data.publicSlug ?? null,
      },
      update: data,
    });
  }

  isSlugTaken(slug: string, excludeBusinessId?: string): Promise<boolean> {
    return this.prisma.membershipSettings
      .findFirst({
        where: {
          publicSlug: slug,
          ...(excludeBusinessId
            ? { businessId: { not: excludeBusinessId } }
            : {}),
        },
      })
      .then(Boolean);
  }

  findBySlug(slug: string) {
    return this.prisma.membershipSettings.findFirst({
      where: { publicSlug: slug },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            displayName: true,
            deletedAt: true,
          },
        },
      },
    });
  }
}
