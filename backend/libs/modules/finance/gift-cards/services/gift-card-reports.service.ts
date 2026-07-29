import { HttpStatus, Injectable } from '@nestjs/common';
import {
  GiftCardSource,
  GiftCardTransactionType,
  Prisma,
} from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { GiftCardReportDateQueryDto } from '../dto/gift-card.dto';

@Injectable()
export class GiftCardReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async usageReport(businessId: string, query: GiftCardReportDateQueryDto) {
    const where = this.dateRangeWhere(businessId, query);
    const rows = await this.prisma.giftCardTransaction.findMany({
      where: {
        businessId,
        ...(where.createdAt ? { createdAt: where.createdAt } : {}),
      },
      include: {
        giftCard: {
          include: {
            ownerContact: {
              select: {
                firstName: true,
                lastName: true,
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: rows.map((row) => ({
        date: row.createdAt,
        giftCardNumber: row.giftCard.number,
        ownerContactName: this.contactName(row.giftCard.ownerContact),
        transactionType: row.type,
        change: row.amount.toFixed(2),
        invoiceId: row.invoiceId,
        balanceAfter: null,
      })),
    };
  }

  async balancesReport(businessId: string, query: GiftCardReportDateQueryDto) {
    const cards = await this.prisma.giftCard.findMany({
      where: { businessId },
      include: {
        ownerContact: {
          select: { firstName: true, lastName: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: cards.map((card) => ({
        giftCardNumber: card.number,
        ownerContactName: this.contactName(card.ownerContact),
        balance: card.currentBalance.toFixed(2),
        status: card.status,
        createdAt: card.createdAt,
        lastUsedAt: null,
      })),
      asOfDate: query.asOfDate ?? new Date().toISOString(),
    };
  }

  async salesReport(businessId: string, query: GiftCardReportDateQueryDto) {
    const where = this.dateRangeWhere(businessId, query);
    const cards = await this.prisma.giftCard.findMany({
      where: {
        businessId,
        source: {
          in: [GiftCardSource.POS_SALE, GiftCardSource.ONLINE_PURCHASE],
        },
        ...(where.createdAt ? { createdAt: where.createdAt } : {}),
      },
      include: { promotion: true },
    });

    const totalValueSold = cards.reduce(
      (sum, c) => sum.add(c.initialValue),
      new Prisma.Decimal(0),
    );
    const totalRevenue = cards.reduce((sum, card) => {
      if (card.promotion) return sum.add(card.promotion.salePrice);
      return sum.add(card.initialValue);
    }, new Prisma.Decimal(0));

    return {
      totalCardsSold: cards.length,
      totalValueSold: totalValueSold.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      byMonth: [],
    };
  }

  async salesDetailsReport(
    businessId: string,
    query: GiftCardReportDateQueryDto,
  ) {
    const where = this.dateRangeWhere(businessId, query);
    const cards = await this.prisma.giftCard.findMany({
      where: {
        businessId,
        source: {
          in: [
            GiftCardSource.POS_SALE,
            GiftCardSource.ONLINE_PURCHASE,
            GiftCardSource.MANUAL,
          ],
        },
        ...(where.createdAt ? { createdAt: where.createdAt } : {}),
      },
      include: {
        promotion: true,
        ownerContact: {
          select: { firstName: true, lastName: true, displayName: true },
        },
        purchasingContact: {
          select: { firstName: true, lastName: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: cards.map((card) => ({
        date: card.createdAt,
        giftCardNumber: card.number,
        promotionName: card.promotion?.name ?? 'No promotion',
        cardValue: card.initialValue.toFixed(2),
        salePrice: card.promotion
          ? card.promotion.salePrice.toFixed(2)
          : card.initialValue.toFixed(2),
        purchaserName: card.purchasingContact
          ? this.contactName(card.purchasingContact)
          : '',
        ownerName: this.contactName(card.ownerContact),
        source: card.source,
      })),
    };
  }

  private dateRangeWhere(
    businessId: string,
    query: GiftCardReportDateQueryDto,
  ): { createdAt?: { gte?: Date; lte?: Date } } {
    void businessId;
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (query.startDate) createdAt.gte = new Date(query.startDate);
    if (query.endDate) createdAt.lte = new Date(query.endDate);
    return Object.keys(createdAt).length > 0 ? { createdAt } : {};
  }

  private contactName(contact: {
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
  }): string {
    if (contact.displayName?.trim()) return contact.displayName.trim();
    return [contact.firstName, contact.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
  }
}
