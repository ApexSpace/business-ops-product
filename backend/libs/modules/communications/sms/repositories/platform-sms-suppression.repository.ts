import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class PlatformSmsSuppressionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isSuppressed(
    platformFromNumber: string,
    customerPhoneE164: string,
  ): Promise<boolean> {
    const row = await this.prisma.platformSmsSuppression.findUnique({
      where: {
        platformFromNumber_customerPhoneE164: {
          platformFromNumber,
          customerPhoneE164,
        },
      },
    });
    if (!row) return false;
    if (!row.optedOutAt) return false;
    if (row.optedInAt && row.optedInAt > row.optedOutAt) return false;
    return true;
  }

  async setOptedOut(params: {
    platformFromNumber: string;
    customerPhoneE164: string;
    businessId?: string | null;
  }) {
    const now = new Date();
    return this.prisma.platformSmsSuppression.upsert({
      where: {
        platformFromNumber_customerPhoneE164: {
          platformFromNumber: params.platformFromNumber,
          customerPhoneE164: params.customerPhoneE164,
        },
      },
      create: {
        platformFromNumber: params.platformFromNumber,
        customerPhoneE164: params.customerPhoneE164,
        businessId: params.businessId ?? null,
        optedOutAt: now,
        optedInAt: null,
      },
      update: {
        businessId: params.businessId ?? undefined,
        optedOutAt: now,
        optedInAt: null,
      },
    });
  }

  async setOptedIn(params: {
    platformFromNumber: string;
    customerPhoneE164: string;
    businessId?: string | null;
  }) {
    const now = new Date();
    return this.prisma.platformSmsSuppression.upsert({
      where: {
        platformFromNumber_customerPhoneE164: {
          platformFromNumber: params.platformFromNumber,
          customerPhoneE164: params.customerPhoneE164,
        },
      },
      create: {
        platformFromNumber: params.platformFromNumber,
        customerPhoneE164: params.customerPhoneE164,
        businessId: params.businessId ?? null,
        optedOutAt: null,
        optedInAt: now,
      },
      update: {
        businessId: params.businessId ?? undefined,
        optedOutAt: null,
        optedInAt: now,
      },
    });
  }
}
