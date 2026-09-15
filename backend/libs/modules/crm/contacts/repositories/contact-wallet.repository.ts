import { Injectable } from '@nestjs/common';
import {
  ContactServiceAdjustment,
  ContactWalletBalance,
  ContactWalletTransaction,
  ContactWalletTransactionType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class ContactWalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBalance(
    businessId: string,
    contactId: string,
  ): Promise<ContactWalletBalance | null> {
    return this.prisma.contactWalletBalance.findFirst({
      where: { businessId, contactId },
    });
  }

  createBalance(
    businessId: string,
    contactId: string,
    currency = 'USD',
  ): Promise<ContactWalletBalance> {
    return this.prisma.contactWalletBalance.create({
      data: { businessId, contactId, currency },
    });
  }

  updateBalance(
    id: string,
    balance: Prisma.Decimal,
  ): Promise<ContactWalletBalance> {
    return this.prisma.contactWalletBalance.update({
      where: { id },
      data: { balance },
    });
  }

  listTransactions(
    businessId: string,
    contactId: string,
    take: number,
  ): Promise<ContactWalletTransaction[]> {
    return this.prisma.contactWalletTransaction.findMany({
      where: { businessId, contactId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  createTransaction(
    data: {
      businessId: string;
      contactId: string;
      amount: Prisma.Decimal;
      type: ContactWalletTransactionType;
      description?: string | null;
      createdById?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<ContactWalletTransaction> {
    const client = tx ?? this.prisma;
    return client.contactWalletTransaction.create({ data });
  }
}
