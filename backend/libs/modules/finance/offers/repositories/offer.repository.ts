import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const offerInclude = {
  discounts: {
    orderBy: { sortOrder: 'asc' as const },
  },
  _count: {
    select: {
      discounts: true,
      usageLog: true,
    },
  },
} satisfies Prisma.OfferInclude;

const offerDetailInclude = {
  discounts: {
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.OfferInclude;

export type OfferListRow = Prisma.OfferGetPayload<{
  include: typeof offerInclude;
}>;
export type OfferDetailRow = Prisma.OfferGetPayload<{
  include: typeof offerDetailInclude;
}>;

@Injectable()
export class OfferRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(businessId: string, search?: string): Promise<OfferListRow[]> {
    const where: Prisma.OfferWhereInput = { businessId };
    if (search?.trim()) {
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }
    return this.prisma.offer.findMany({
      where,
      include: offerInclude,
      orderBy: { sortOrder: 'asc' },
    });
  }

  findEnabledWithDiscounts(businessId: string): Promise<OfferDetailRow[]> {
    return this.prisma.offer.findMany({
      where: { businessId, isEnabled: true },
      include: offerDetailInclude,
      orderBy: { sortOrder: 'asc' },
    });
  }

  findById(businessId: string, id: string): Promise<OfferDetailRow | null> {
    return this.prisma.offer.findFirst({
      where: { businessId, id },
      include: offerDetailInclude,
    });
  }

  findByOfferCode(
    businessId: string,
    offerCode: string,
  ): Promise<OfferDetailRow | null> {
    return this.prisma.offer.findFirst({
      where: {
        businessId,
        offerCode: offerCode.toUpperCase(),
        isEnabled: true,
        applicationMode: 'OFFER_CODE',
      },
      include: offerDetailInclude,
    });
  }

  findByOfferCodeCaseInsensitive(
    businessId: string,
    offerCode: string,
    excludeId?: string,
  ): Promise<{ id: string } | null> {
    return this.prisma.offer.findFirst({
      where: {
        businessId,
        offerCode: offerCode.toUpperCase(),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  hasOfferCodeOffers(businessId: string): Promise<boolean> {
    return this.prisma.offer
      .count({
        where: {
          businessId,
          isEnabled: true,
          applicationMode: 'OFFER_CODE',
          offerCode: { not: null },
        },
      })
      .then((count) => count > 0);
  }

  create(
    businessId: string,
    data: Omit<Prisma.OfferCreateInput, 'business'>,
  ): Promise<OfferDetailRow> {
    return this.prisma.offer.create({
      data: {
        ...data,
        business: { connect: { id: businessId } },
      },
      include: offerDetailInclude,
    });
  }

  update(
    businessId: string,
    id: string,
    data: Prisma.OfferUpdateInput,
  ): Promise<OfferDetailRow> {
    return this.prisma.offer.update({
      where: { id },
      data,
      include: offerDetailInclude,
    });
  }

  delete(businessId: string, id: string): Promise<void> {
    return this.prisma.offer
      .deleteMany({ where: { businessId, id } })
      .then(() => undefined);
  }

  nextSortOrder(businessId: string): Promise<number> {
    return this.prisma.offer
      .aggregate({
        where: { businessId },
        _max: { sortOrder: true },
      })
      .then((result) => (result._max.sortOrder ?? -1) + 1);
  }

  reorder(businessId: string, ids: string[]): Promise<void> {
    return this.prisma
      .$transaction(
        ids.map((id, index) =>
          this.prisma.offer.updateMany({
            where: { businessId, id },
            data: { sortOrder: index },
          }),
        ),
      )
      .then(() => undefined);
  }

  createDiscount(
    offerId: string,
    data: Omit<Prisma.OfferDiscountCreateInput, 'offer'>,
  ) {
    return this.prisma.offerDiscount.create({
      data: {
        ...data,
        offer: { connect: { id: offerId } },
      },
    });
  }

  updateDiscount(
    offerId: string,
    discountId: string,
    data: Prisma.OfferDiscountUpdateInput,
  ) {
    return this.prisma.offerDiscount.updateMany({
      where: { id: discountId, offerId },
      data,
    });
  }

  deleteDiscount(offerId: string, discountId: string) {
    return this.prisma.offerDiscount.deleteMany({
      where: { id: discountId, offerId },
    });
  }

  reorderDiscounts(offerId: string, orderedIds: string[]) {
    return this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.offerDiscount.updateMany({
          where: { id, offerId },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  countDiscounts(offerId: string): Promise<number> {
    return this.prisma.offerDiscount.count({ where: { offerId } });
  }

  findUsageCountByContact(offerId: string, contactId: string): Promise<number> {
    return this.prisma.offerUsageLog.count({
      where: { offerId, contactId },
    });
  }

  countCompletedSalesForContact(
    businessId: string,
    contactId: string,
  ): Promise<number> {
    return this.prisma.invoice.count({
      where: {
        businessId,
        contactId,
        kind: 'CHECKOUT',
        status: 'PAID',
        deletedAt: null,
      },
    });
  }

  createUsageLog(data: {
    offerId: string;
    businessId: string;
    contactId?: string;
    saleId?: string;
    discountAmount?: number;
    offerCodeUsed?: string;
  }) {
    return this.prisma.offerUsageLog.create({
      data: {
        offerId: data.offerId,
        businessId: data.businessId,
        contactId: data.contactId ?? null,
        saleId: data.saleId ?? null,
        offerCodeUsed: data.offerCodeUsed ?? null,
        discountAmount:
          data.discountAmount != null
            ? new Prisma.Decimal(data.discountAmount.toFixed(2))
            : null,
      },
    });
  }

  findUsageReport(
    businessId: string,
    params: {
      offerId?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const where: Prisma.OfferUsageLogWhereInput = { businessId };
    if (params.offerId) where.offerId = params.offerId;
    if (params.startDate || params.endDate) {
      where.usedAt = {};
      if (params.startDate) where.usedAt.gte = params.startDate;
      if (params.endDate) where.usedAt.lte = params.endDate;
    }
    return this.prisma.offerUsageLog.findMany({
      where,
      include: {
        offer: { select: { name: true } },
        contact: {
          select: {
            displayName: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { usedAt: 'desc' },
    });
  }
}
