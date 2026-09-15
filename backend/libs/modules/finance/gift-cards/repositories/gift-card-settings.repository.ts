import { Injectable } from '@nestjs/common';
import { GiftCardSettings } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class GiftCardSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByBusinessId(businessId: string): Promise<GiftCardSettings | null> {
    return this.prisma.giftCardSettings.findUnique({ where: { businessId } });
  }

  findByPublicSlug(publicSlug: string): Promise<GiftCardSettings | null> {
    return this.prisma.giftCardSettings.findFirst({
      where: { publicSlug },
    });
  }

  upsert(
    businessId: string,
    data: Partial<
      Pick<
        GiftCardSettings,
        | 'publicSlug'
        | 'onlineSalesEnabled'
        | 'purchaseDisclaimer'
        | 'selectedArtworkKey'
        | 'autoGenerateNumber'
        | 'internalNotifyEmail'
      >
    >,
  ): Promise<GiftCardSettings> {
    return this.prisma.giftCardSettings.upsert({
      where: { businessId },
      create: { businessId, ...data },
      update: data,
    });
  }
}
