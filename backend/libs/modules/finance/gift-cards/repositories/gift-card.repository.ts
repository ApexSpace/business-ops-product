import { Injectable } from '@nestjs/common';
import {
  GiftCard,
  GiftCardSource,
  GiftCardStatus,
  GiftCardTransaction,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const contactSelect = {
  id: true,
  firstName: true,
  lastName: true,
  displayName: true,
  email: true,
} as const;

const listInclude = {
  ownerContact: { select: contactSelect },
  purchasingContact: { select: contactSelect },
} satisfies Prisma.GiftCardInclude;

const detailInclude = {
  ownerContact: { select: contactSelect },
  purchasingContact: { select: contactSelect },
  promotion: true,
  transactions: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.GiftCardInclude;

export type GiftCardListRow = Prisma.GiftCardGetPayload<{
  include: typeof listInclude;
}>;

export type GiftCardDetailRow = Prisma.GiftCardGetPayload<{
  include: typeof detailInclude;
}>;

@Injectable()
export class GiftCardRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.GiftCardWhereInput,
  ): Prisma.GiftCardWhereInput {
    return { businessId, ...extra };
  }

  private redeemableWhere(
    businessId: string,
    extra?: Prisma.GiftCardWhereInput,
  ): Prisma.GiftCardWhereInput {
    return this.activeWhere(businessId, {
      status: GiftCardStatus.ACTIVE,
      currentBalance: { gt: 0 },
      ...extra,
    });
  }

  async findMany(
    businessId: string,
    opts: {
      skip: number;
      take: number;
      search?: string;
      redeemableOnly?: boolean;
    },
  ): Promise<{ items: GiftCardListRow[]; total: number }> {
    const where: Prisma.GiftCardWhereInput = opts.redeemableOnly
      ? this.redeemableWhere(businessId)
      : this.activeWhere(businessId);
    if (opts.search?.trim()) {
      const q = opts.search.trim();
      where.OR = [
        { number: { contains: q, mode: 'insensitive' } },
        {
          ownerContact: {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { displayName: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
        {
          purchasingContact: {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { displayName: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.giftCard.findMany({
        where,
        include: listInclude,
        orderBy: { createdAt: 'desc' },
        skip: opts.skip,
        take: opts.take,
      }),
      this.prisma.giftCard.count({ where }),
    ]);
    return { items, total };
  }

  findById(businessId: string, id: string): Promise<GiftCardDetailRow | null> {
    return this.prisma.giftCard.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: detailInclude,
    });
  }

  findByNumber(businessId: string, number: string): Promise<GiftCard | null> {
    return this.prisma.giftCard.findFirst({
      where: this.activeWhere(businessId, { number }),
    });
  }

  findByOwnerContact(
    businessId: string,
    ownerContactId: string,
  ): Promise<GiftCardListRow[]> {
    return this.prisma.giftCard.findMany({
      where: this.redeemableWhere(businessId, { ownerContactId }),
      include: listInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWithTransaction(
    data: Prisma.GiftCardCreateInput,
    transaction: {
      businessId: string;
      type: GiftCardTransaction['type'];
      amount: Prisma.Decimal;
      note?: string | null;
      invoiceId?: string | null;
    },
  ): Promise<GiftCardDetailRow> {
    return this.prisma.$transaction(async (tx) => {
      const card = await tx.giftCard.create({
        data,
        include: detailInclude,
      });
      await tx.giftCardTransaction.create({
        data: {
          businessId: transaction.businessId,
          giftCard: { connect: { id: card.id } },
          type: transaction.type,
          amount: transaction.amount,
          note: transaction.note ?? null,
          invoiceId: transaction.invoiceId ?? null,
        },
      });
      return tx.giftCard.findFirstOrThrow({
        where: { id: card.id },
        include: detailInclude,
      });
    });
  }

  async applyTransaction(
    businessId: string,
    giftCardId: string,
    transaction: {
      type: GiftCardTransaction['type'];
      amount: Prisma.Decimal;
      note?: string | null;
      invoiceId?: string | null;
    },
    nextBalance: Prisma.Decimal,
    nextStatus: GiftCardStatus,
  ): Promise<GiftCardDetailRow> {
    return this.prisma.$transaction(async (tx) => {
      await tx.giftCardTransaction.create({
        data: {
          businessId,
          giftCardId,
          type: transaction.type,
          amount: transaction.amount,
          note: transaction.note ?? null,
          invoiceId: transaction.invoiceId ?? null,
        },
      });
      await tx.giftCard.updateMany({
        where: { id: giftCardId, businessId },
        data: {
          currentBalance: nextBalance,
          status: nextStatus,
        },
      });
      return tx.giftCard.findFirstOrThrow({
        where: { id: giftCardId, businessId },
        include: detailInclude,
      });
    });
  }

  update(
    businessId: string,
    id: string,
    data: Prisma.GiftCardUpdateManyMutationInput,
  ): Promise<GiftCardDetailRow | null> {
    return this.prisma.giftCard
      .updateMany({ where: { id, businessId }, data })
      .then(async (result) => {
        if (result.count === 0) return null;
        return this.findById(businessId, id);
      });
  }

  countByPromotion(businessId: string, promotionId: string): Promise<number> {
    return this.prisma.giftCard.count({
      where: this.activeWhere(businessId, { promotionId }),
    });
  }

  findActiveByOwner(
    businessId: string,
    ownerContactId: string,
  ): Promise<GiftCard[]> {
    return this.prisma.giftCard.findMany({
      where: this.activeWhere(businessId, {
        ownerContactId,
        status: GiftCardStatus.ACTIVE,
        currentBalance: { gt: 0 },
      }),
      orderBy: { createdAt: 'desc' },
    });
  }
}
