import { Injectable } from '@nestjs/common';
import { PackageSettings, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class PackageSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByBusinessId(businessId: string): Promise<PackageSettings | null> {
    return this.prisma.packageSettings.findUnique({ where: { businessId } });
  }

  findByPublicSlug(slug: string): Promise<PackageSettings | null> {
    return this.prisma.packageSettings.findFirst({
      where: { publicSlug: slug },
    });
  }

  upsert(
    businessId: string,
    data: Prisma.PackageSettingsUpdateInput,
  ): Promise<PackageSettings> {
    return this.prisma.packageSettings.upsert({
      where: { businessId },
      create: {
        businessId,
        onlineSalesEnabled:
          typeof data.onlineSalesEnabled === 'boolean'
            ? data.onlineSalesEnabled
            : false,
        publicSlug:
          typeof data.publicSlug === 'string' || data.publicSlug === null
            ? data.publicSlug
            : undefined,
      },
      update: data,
    });
  }

  async isSlugTaken(
    slug: string,
    excludeBusinessId?: string,
  ): Promise<boolean> {
    const existing = await this.prisma.packageSettings.findFirst({
      where: {
        publicSlug: slug,
        ...(excludeBusinessId
          ? { businessId: { not: excludeBusinessId } }
          : {}),
      },
    });
    return !!existing;
  }
}
