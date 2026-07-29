import { Injectable } from '@nestjs/common';
import { MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { TimeCardSortBy } from '../dto/list-time-cards-query.dto';

const timeCardInclude = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.TimeCardInclude;

export type TimeCardWithUser = Prisma.TimeCardGetPayload<{
  include: typeof timeCardInclude;
}>;

@Injectable()
export class TimeCardRepository {
  constructor(private readonly prisma: PrismaService) {}

  private baseWhere(
    businessId: string,
    extra?: Prisma.TimeCardWhereInput,
  ): Prisma.TimeCardWhereInput {
    return { businessId, ...extra };
  }

  findById(businessId: string, id: string): Promise<TimeCardWithUser | null> {
    return this.prisma.timeCard.findFirst({
      where: this.baseWhere(businessId, { id }),
      include: timeCardInclude,
    });
  }

  findOpenForUser(
    businessId: string,
    userId: string,
  ): Promise<TimeCardWithUser | null> {
    return this.prisma.timeCard.findFirst({
      where: this.baseWhere(businessId, {
        userId,
        clockOutTime: null,
      }),
      include: timeCardInclude,
      orderBy: { clockInTime: 'desc' },
    });
  }

  create(
    businessId: string,
    data: {
      userId: string;
      clockInTime: Date;
      clockOutTime?: Date | null;
      paidMinutes?: number | null;
      notes?: string | null;
    },
  ): Promise<TimeCardWithUser> {
    return this.prisma.timeCard.create({
      data: {
        businessId,
        userId: data.userId,
        clockInTime: data.clockInTime,
        clockOutTime: data.clockOutTime ?? null,
        paidMinutes: data.paidMinutes ?? null,
        notes: data.notes ?? null,
      },
      include: timeCardInclude,
    });
  }

  update(
    businessId: string,
    id: string,
    data: Prisma.TimeCardUpdateInput,
  ): Promise<TimeCardWithUser> {
    return this.prisma.timeCard.update({
      where: { id },
      data,
      include: timeCardInclude,
    });
  }

  delete(businessId: string, id: string): Promise<void> {
    return this.prisma.timeCard
      .deleteMany({ where: { id, businessId } })
      .then(() => undefined);
  }

  findMany(
    businessId: string,
    params: {
      skip: number;
      take: number;
      userId?: string;
      clockInFrom?: Date;
      clockInTo?: Date;
      sortBy?: TimeCardSortBy;
    },
  ): Promise<{ items: TimeCardWithUser[]; total: number }> {
    const where = this.baseWhere(businessId, {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.clockInFrom || params.clockInTo
        ? {
            clockInTime: {
              ...(params.clockInFrom ? { gte: params.clockInFrom } : {}),
              ...(params.clockInTo ? { lte: params.clockInTo } : {}),
            },
          }
        : {}),
    });

    const orderBy: Prisma.TimeCardOrderByWithRelationInput[] =
      params.sortBy === TimeCardSortBy.STAFF
        ? [
            { user: { firstName: 'asc' } },
            { user: { lastName: 'asc' } },
            { clockInTime: 'desc' },
          ]
        : [{ clockInTime: 'desc' }];

    return Promise.all([
      this.prisma.timeCard.findMany({
        where,
        include: timeCardInclude,
        orderBy,
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.timeCard.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  findMembershipsWithPins(businessId: string) {
    return this.prisma.businessMembership.findMany({
      where: {
        businessId,
        deletedAt: null,
        status: MembershipStatus.ACTIVE,
        timeclockPin: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
}
