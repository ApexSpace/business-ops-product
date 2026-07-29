import { Injectable } from '@nestjs/common';
import { GiftCardPromotion, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class GiftCardPromotionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(businessId: string): Promise<GiftCardPromotion[]> {
    return this.prisma.giftCardPromotion.findMany({
      where: { businessId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findActive(
    businessId: string,
    now = new Date(),
  ): Promise<GiftCardPromotion[]> {
    return this.prisma.giftCardPromotion.findMany({
      where: {
        businessId,
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findById(businessId: string, id: string): Promise<GiftCardPromotion | null> {
    return this.prisma.giftCardPromotion.findFirst({
      where: { id, businessId },
    });
  }

  create(
    data: Prisma.GiftCardPromotionCreateInput,
  ): Promise<GiftCardPromotion> {
    return this.prisma.giftCardPromotion.create({ data });
  }

  update(
    businessId: string,
    id: string,
    data: Prisma.GiftCardPromotionUpdateManyMutationInput,
  ): Promise<GiftCardPromotion | null> {
    return this.prisma.giftCardPromotion
      .updateMany({ where: { id, businessId }, data })
      .then(async (result) => {
        if (result.count === 0) return null;
        return this.findById(businessId, id);
      });
  }

  delete(businessId: string, id: string): Promise<boolean> {
    return this.prisma.giftCardPromotion
      .deleteMany({ where: { id, businessId } })
      .then((r) => r.count > 0);
  }

  maxSortOrder(businessId: string): Promise<number> {
    return this.prisma.giftCardPromotion
      .aggregate({
        where: { businessId },
        _max: { sortOrder: true },
      })
      .then((r) => r._max.sortOrder ?? -1);
  }

  async reorder(businessId: string, orderedIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.giftCardPromotion.updateMany({
          where: { id, businessId },
          data: { sortOrder: index },
        }),
      ),
    );
  }
}
