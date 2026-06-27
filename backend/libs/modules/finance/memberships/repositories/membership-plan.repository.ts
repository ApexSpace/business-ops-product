import { Injectable } from '@nestjs/common';
import { ClientMembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const serviceSelect = {
  id: true,
  name: true,
  price: true,
} as const;

const serviceGroupInclude = {
  services: {
    include: { service: { select: serviceSelect } },
    orderBy: { id: 'asc' as const },
  },
} satisfies Prisma.MembershipServiceGroupInclude;

const planInclude = {
  serviceGroups: {
    include: serviceGroupInclude,
    orderBy: { sortOrder: 'asc' as const },
  },
  _count: {
    select: {
      clientMemberships: {
        where: {
          status: {
            in: [
              ClientMembershipStatus.ACTIVE,
              ClientMembershipStatus.SCHEDULED,
              ClientMembershipStatus.PAST_DUE,
            ],
          },
        },
      },
    },
  },
} satisfies Prisma.MembershipPlanInclude;

export type MembershipPlanRow = Prisma.MembershipPlanGetPayload<{
  include: typeof planInclude;
}>;

@Injectable()
export class MembershipPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.MembershipPlanWhereInput,
  ): Prisma.MembershipPlanWhereInput {
    return { businessId, isArchived: false, ...extra };
  }

  findMany(
    businessId: string,
    includeArchived = false,
  ): Promise<MembershipPlanRow[]> {
    return this.prisma.membershipPlan.findMany({
      where: includeArchived
        ? { businessId }
        : this.activeWhere(businessId),
      include: planInclude,
      orderBy: { sortOrder: 'asc' },
    });
  }

  findById(
    businessId: string,
    id: string,
  ): Promise<MembershipPlanRow | null> {
    return this.prisma.membershipPlan.findFirst({
      where: { businessId, id },
      include: planInclude,
    });
  }

  findPublicPlan(
    businessId: string,
    planId: string,
  ): Promise<MembershipPlanRow | null> {
    return this.prisma.membershipPlan.findFirst({
      where: {
        businessId,
        id: planId,
        availableOnline: true,
        isArchived: false,
      },
      include: planInclude,
    });
  }

  findOnlinePlans(businessId: string): Promise<MembershipPlanRow[]> {
    return this.prisma.membershipPlan.findMany({
      where: {
        businessId,
        availableOnline: true,
        isArchived: false,
      },
      include: planInclude,
      orderBy: { sortOrder: 'asc' },
    });
  }

  create(
    businessId: string,
    data: Omit<Prisma.MembershipPlanCreateInput, 'business'>,
  ): Promise<MembershipPlanRow> {
    return this.prisma.membershipPlan.create({
      data: {
        ...data,
        business: { connect: { id: businessId } },
      },
      include: planInclude,
    });
  }

  update(
    businessId: string,
    id: string,
    data: Prisma.MembershipPlanUpdateInput,
  ): Promise<MembershipPlanRow> {
    return this.prisma.membershipPlan.update({
      where: { id },
      data,
      include: planInclude,
    });
  }

  async archive(businessId: string, id: string): Promise<void> {
    await this.prisma.membershipPlan.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  countActiveMemberships(businessId: string, planId: string): Promise<number> {
    return this.prisma.clientMembership.count({
      where: {
        businessId,
        planId,
        status: {
          in: [
            ClientMembershipStatus.ACTIVE,
            ClientMembershipStatus.SCHEDULED,
            ClientMembershipStatus.PAST_DUE,
            ClientMembershipStatus.PAUSED,
          ],
        },
      },
    });
  }

  async nextSortOrder(businessId: string): Promise<number> {
    const max = await this.prisma.membershipPlan.aggregate({
      where: { businessId },
      _max: { sortOrder: true },
    });
    return (max._max.sortOrder ?? -1) + 1;
  }

  async reorder(businessId: string, ids: string[]): Promise<void> {
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.membershipPlan.updateMany({
          where: { id, businessId },
          data: { sortOrder: index },
        }),
      ),
    );
  }
}
