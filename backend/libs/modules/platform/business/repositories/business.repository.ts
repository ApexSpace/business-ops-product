import { Injectable } from '@nestjs/common';
import {
  Business,
  BusinessLifecycleStage,
  BusinessStatus,
  BusinessType,
  Prisma,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { customerBusinessWhere } from '../utils/tenant-business-scope.util';

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

  /** ACTIVE lifecycle customers with ACTIVE workspace status. */
  findAllActive(): Promise<Business[]> {
    return this.prisma.business.findMany({
      where: customerBusinessWhere({
        deletedAt: null,
        status: BusinessStatus.ACTIVE,
      }),
      orderBy: { name: 'asc' },
    });
  }

  /** ACTIVE lifecycle customers (any BusinessStatus except deleted). */
  findAllNonDeleted(): Promise<Business[]> {
    return this.prisma.business.findMany({
      where: customerBusinessWhere({ deletedAt: null }),
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Lists customer businesses. Default lifecycle = ACTIVE only.
   * Pass `lifecycleStages` to include funnel/trial rows (explicit opt-in).
   * Pass `includeInternal: true` only for rare platform diagnostics.
   */
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
    includeInternal?: boolean;
    lifecycleStages?: BusinessLifecycleStage[];
  }): Promise<{ items: BusinessListItem[]; total: number }> {
    const search = params.search?.trim();
    const lifecycleFilter =
      params.lifecycleStages?.length && !params.includeInternal
        ? { lifecycleStage: { in: params.lifecycleStages } }
        : params.includeInternal
          ? {}
          : { lifecycleStage: BusinessLifecycleStage.ACTIVE };

    const where: Prisma.BusinessWhereInput = {
      ...(params.includeInternal ? {} : { type: BusinessType.TENANT }),
      ...lifecycleFilter,
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
              ...(params.planTierId ? { planTierId: params.planTierId } : {}),
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
