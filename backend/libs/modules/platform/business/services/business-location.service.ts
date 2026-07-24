import { Injectable } from '@nestjs/common';
import { BusinessLocationStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { EntitlementService } from './entitlement.service';

@Injectable()
export class BusinessLocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementService,
  ) {}

  async list(businessId: string) {
    return this.prisma.businessLocation.findMany({
      where: {
        businessId,
        status: { not: BusinessLocationStatus.INACTIVE },
      },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });
  }

  async create(
    businessId: string,
    input: {
      name: string;
      addressLine1?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
      timezone?: string | null;
      isPrimary?: boolean;
    },
  ) {
    await this.entitlements.assertLocationLimit(businessId);

    if (input.isPrimary) {
      await this.prisma.businessLocation.updateMany({
        where: { businessId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const location = await this.prisma.businessLocation.create({
      data: {
        businessId,
        name: input.name,
        address: input.addressLine1 ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        zip: input.postalCode ?? null,
        country: input.country ?? null,
        timezone: input.timezone ?? null,
        isPrimary: input.isPrimary ?? false,
        status: BusinessLocationStatus.ACTIVE,
      },
    });

    await this.entitlements.invalidate(businessId);
    return location;
  }
}
