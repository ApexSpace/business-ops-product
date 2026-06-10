import { Injectable } from '@nestjs/common';
import {
  Business,
  BusinessStatus,
  Prisma,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const businessListInclude = {
  industry: true,
  snapshot: true,
  subscription: {
    include: {
      planTier: { select: { id: true, name: true } },
      planGroup: { select: { name: true } },
    },
  },
} satisfies Prisma.BusinessInclude;

export type BusinessListItem = Prisma.BusinessGetPayload<{
  include: typeof businessListInclude;
}>;

@Injectable()
export class BusinessRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.BusinessCreateInput): Promise<Business> {
    return this.prisma.business.create({ data });
  }

  findById(id: string, includeDeleted = false) {
    return this.prisma.business.findFirst({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      include: businessListInclude,
    });
  }

  findAllActive(): Promise<Business[]> {
    return this.prisma.business.findMany({
      where: {
        deletedAt: null,
        status: BusinessStatus.ACTIVE,
      },
      orderBy: { name: 'asc' },
    });
  }

  findAllNonDeleted(): Promise<Business[]> {
    return this.prisma.business.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  findMany(params: {
    skip: number;
    take: number;
    status?: BusinessStatus;
    subscriptionStatus?: SubscriptionStatus;
    paymentStatus?: SubscriptionPaymentStatus;
    planGroupId?: string;
    planTierId?: string;
    search?: string;
    includeDeleted?: boolean;
    businessIds?: string[];
  }): Promise<{ items: BusinessListItem[]; total: number }> {
    const search = params.search?.trim();
    const where: Prisma.BusinessWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.includeDeleted ? {} : { deletedAt: null }),
      ...(params.businessIds ? { id: { in: params.businessIds } } : {}),
      ...(params.subscriptionStatus ||
      params.paymentStatus ||
      params.planGroupId ||
      params.planTierId
        ? {
            subscription: {
              ...(params.subscriptionStatus
                ? { status: params.subscriptionStatus }
                : {}),
              ...(params.paymentStatus
                ? { paymentStatus: params.paymentStatus }
                : {}),
              ...(params.planGroupId
                ? { planGroupId: params.planGroupId }
                : {}),
              ...(params.planTierId
                ? { planTierId: params.planTierId }
                : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return Promise.all([
      this.prisma.business.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { updatedAt: 'desc' },
        include: businessListInclude,
      }),
      this.prisma.business.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  update(id: string, data: Prisma.BusinessUpdateInput) {
    return this.prisma.business.update({
      where: { id },
      data,
      include: { industry: true, snapshot: true },
    });
  }

  softDelete(id: string): Promise<Business> {
    return this.prisma.business.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { businessId: id } });
      await tx.business.delete({ where: { id } });
    });
  }
}
