import { Injectable } from '@nestjs/common';
import {
  BusinessSubscriptionPayment,
  BusinessSubscriptionPaymentDirection,
  BusinessSubscriptionPaymentSource,
  BusinessSubscriptionPaymentType,
  Prisma,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

export type CreateSubscriptionPaymentInput = {
  businessId: string;
  subscriptionId?: string | null;
  amount: Prisma.Decimal | number | string;
  currency: string;
  paymentMethod: Prisma.BusinessSubscriptionPaymentCreateInput['paymentMethod'];
  paymentStatus: SubscriptionPaymentStatus;
  paymentType: Prisma.BusinessSubscriptionPaymentCreateInput['paymentType'];
  billingCycle: Prisma.BusinessSubscriptionPaymentCreateInput['billingCycle'];
  direction?: Prisma.BusinessSubscriptionPaymentCreateInput['direction'];
  source?: BusinessSubscriptionPaymentSource;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  dueDate?: Date | null;
  paidAt?: Date | null;
  recordedAt?: Date;
  paymentReference?: string | null;
  notes?: string | null;
  metadata?: Prisma.InputJsonValue;
  externalProvider?: string | null;
  externalPaymentId?: string | null;
  createdById?: string | null;
};

@Injectable()
export class BusinessSubscriptionPaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    data: CreateSubscriptionPaymentInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BusinessSubscriptionPayment> {
    const client = tx ?? this.prisma;
    return client.businessSubscriptionPayment.create({ data });
  }

  findById(id: string): Promise<BusinessSubscriptionPayment | null> {
    return this.prisma.businessSubscriptionPayment.findUnique({
      where: { id },
    });
  }

  findMany(params: {
    businessId: string;
    paymentStatus?: SubscriptionPaymentStatus;
    paymentMethod?: SubscriptionPaymentMethod;
    paymentType?: BusinessSubscriptionPaymentType;
    paymentDirection?: BusinessSubscriptionPaymentDirection;
    from?: Date;
    to?: Date;
    includeVoided?: boolean;
    cursor?: string;
    limit: number;
  }): Promise<BusinessSubscriptionPayment[]> {
    const where: Prisma.BusinessSubscriptionPaymentWhereInput = {
      businessId: params.businessId,
      ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
      ...(params.paymentMethod ? { paymentMethod: params.paymentMethod } : {}),
      ...(params.paymentType ? { paymentType: params.paymentType } : {}),
      ...(params.paymentDirection
        ? { direction: params.paymentDirection }
        : {}),
      ...(params.from || params.to
        ? {
            recordedAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
      ...(params.includeVoided === false || params.includeVoided === undefined
        ? { voidedAt: null }
        : {}),
      ...(params.cursor ? { id: { lt: params.cursor } } : {}),
    };

    return this.prisma.businessSubscriptionPayment.findMany({
      where,
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
      take: params.limit + 1,
    });
  }

  update(
    id: string,
    data: Prisma.BusinessSubscriptionPaymentUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<BusinessSubscriptionPayment> {
    const client = tx ?? this.prisma;
    return client.businessSubscriptionPayment.update({ where: { id }, data });
  }

  findLatestPaidAt(businessId: string): Promise<Date | null> {
    return this.prisma.businessSubscriptionPayment
      .findFirst({
        where: {
          businessId,
          voidedAt: null,
          paymentStatus: SubscriptionPaymentStatus.PAID,
          paidAt: { not: null },
        },
        orderBy: { paidAt: 'desc' },
        select: { paidAt: true },
      })
      .then((row) => row?.paidAt ?? null);
  }
}
