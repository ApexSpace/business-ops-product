import { Injectable } from '@nestjs/common';
import {
  BusinessMemberRole,
  BusinessMembership,
  MembershipStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

const membershipWithUser = Prisma.validator<Prisma.BusinessMembershipDefaultArgs>()(
  {
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      },
    },
  },
);

export type BusinessMembershipWithUser = Prisma.BusinessMembershipGetPayload<
  typeof membershipWithUser
>;

@Injectable()
export class BusinessMembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserAndBusiness(
    userId: string,
    businessId: string,
  ): Promise<BusinessMembership | null> {
    return this.prisma.businessMembership.findFirst({
      where: { userId, businessId, deletedAt: null },
    });
  }

  findByUserAndBusinessAny(
    userId: string,
    businessId: string,
  ): Promise<BusinessMembership | null> {
    return this.prisma.businessMembership.findUnique({
      where: { userId_businessId: { userId, businessId } },
    });
  }

  findActiveByUserAndBusiness(
    userId: string,
    businessId: string,
  ): Promise<
    (BusinessMembership & { business: { status: string; deletedAt: Date | null } }) | null
  > {
    return this.prisma.businessMembership.findFirst({
      where: {
        userId,
        businessId,
        deletedAt: null,
        status: MembershipStatus.ACTIVE,
      },
      include: {
        business: { select: { status: true, deletedAt: true } },
      },
    }) as Promise<
      (BusinessMembership & {
        business: { status: string; deletedAt: Date | null };
      }) | null
    >;
  }

  private membershipWhere(
    businessId: string,
    includeRemoved = false,
    search?: string,
  ): Prisma.BusinessMembershipWhereInput {
    const base: Prisma.BusinessMembershipWhereInput = {
      businessId,
      deletedAt: null,
      ...(includeRemoved
        ? {}
        : { status: { not: MembershipStatus.REMOVED } }),
    };
    if (!search?.trim()) return base;
    const term = search.trim();
    return {
      ...base,
      OR: [
        { user: { email: { contains: term, mode: 'insensitive' } } },
        { user: { firstName: { contains: term, mode: 'insensitive' } } },
        { user: { lastName: { contains: term, mode: 'insensitive' } } },
      ],
    };
  }

  findByBusinessId(
    businessId: string,
    includeRemoved = false,
  ): Promise<BusinessMembershipWithUser[]> {
    return this.prisma.businessMembership.findMany({
      where: this.membershipWhere(businessId, includeRemoved),
      ...membershipWithUser,
      orderBy: { createdAt: 'asc' },
    });
  }

  findManyPaginated(
    businessId: string,
    params: { skip: number; take: number; search?: string },
    includeRemoved = false,
  ): Promise<{ items: BusinessMembershipWithUser[]; total: number }> {
    const where = this.membershipWhere(
      businessId,
      includeRemoved,
      params.search,
    );
    return Promise.all([
      this.prisma.businessMembership.findMany({
        where,
        ...membershipWithUser,
        orderBy: { createdAt: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.businessMembership.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  countOwners(businessId: string): Promise<number> {
    return this.prisma.businessMembership.count({
      where: {
        businessId,
        role: BusinessMemberRole.OWNER,
        deletedAt: null,
        status: { not: MembershipStatus.REMOVED },
      },
    });
  }

  create(data: Prisma.BusinessMembershipCreateInput): Promise<BusinessMembership> {
    return this.prisma.businessMembership.create({ data });
  }

  update(
    id: string,
    data: Prisma.BusinessMembershipUpdateInput,
  ): Promise<BusinessMembership> {
    return this.prisma.businessMembership.update({ where: { id }, data });
  }

  findById(id: string): Promise<BusinessMembershipWithUser | null> {
    return this.prisma.businessMembership.findFirst({
      where: { id, deletedAt: null },
      ...membershipWithUser,
    });
  }

  findByUserAndBusinessWithUser(
    userId: string,
    businessId: string,
  ): Promise<BusinessMembershipWithUser | null> {
    return this.prisma.businessMembership.findFirst({
      where: { userId, businessId, deletedAt: null },
      ...membershipWithUser,
    });
  }

  findByInviteToken(token: string): Promise<BusinessMembership | null> {
    return this.prisma.businessMembership.findFirst({
      where: { inviteToken: token, deletedAt: null },
    });
  }
}
