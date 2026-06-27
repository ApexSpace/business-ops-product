import { Injectable } from '@nestjs/common';
import { ClientMembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const contactSelect = {
  id: true,
  firstName: true,
  lastName: true,
  displayName: true,
  email: true,
} as const;

const listInclude = {
  contact: { select: contactSelect },
  plan: {
    select: {
      id: true,
      name: true,
      emoji: true,
      price: true,
      billingIntervalUnit: true,
    },
  },
} satisfies Prisma.ClientMembershipInclude;

const detailInclude = {
  ...listInclude,
  usageRecords: {
    include: {
      serviceGroup: {
        include: {
          services: {
            include: { service: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: { periodStart: 'desc' as const },
  },
  billingHistory: { orderBy: { occurredAt: 'desc' as const }, take: 50 },
} satisfies Prisma.ClientMembershipInclude;

export type ClientMembershipListRow = Prisma.ClientMembershipGetPayload<{
  include: typeof listInclude;
}>;

export type ClientMembershipDetailRow = Prisma.ClientMembershipGetPayload<{
  include: typeof detailInclude;
}>;

const ACTIVE_STATUSES: ClientMembershipStatus[] = [
  ClientMembershipStatus.ACTIVE,
  ClientMembershipStatus.PAST_DUE,
];

@Injectable()
export class ClientMembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  private baseWhere(
    businessId: string,
    extra?: Prisma.ClientMembershipWhereInput,
  ): Prisma.ClientMembershipWhereInput {
    return { businessId, ...extra };
  }

  async findMany(
    businessId: string,
    opts: {
      contactId?: string;
      search?: string;
      status?: ClientMembershipStatus | 'all_except_canceled';
      planId?: string;
      showDifferentVersionsOnly?: boolean;
      showOlderUnpaid?: boolean;
    },
  ): Promise<ClientMembershipListRow[]> {
    const where = this.baseWhere(businessId);

    if (opts.contactId) where.contactId = opts.contactId;
    if (opts.planId) where.planId = opts.planId;

    if (opts.status === 'all_except_canceled' || !opts.status) {
      where.status = { not: ClientMembershipStatus.CANCELED };
    } else {
      where.status = opts.status;
    }

    if (opts.showOlderUnpaid === true) {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      where.status = ClientMembershipStatus.UNPAID;
      where.updatedAt = { lte: oneMonthAgo };
    }

    if (opts.search?.trim()) {
      const q = opts.search.trim();
      where.OR = [
        { plan: { name: { contains: q, mode: 'insensitive' } } },
        {
          contact: {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { displayName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const rows = await this.prisma.clientMembership.findMany({
      where,
      include: listInclude,
      orderBy: { startDate: 'desc' },
    });

    if (opts.showDifferentVersionsOnly === true) {
      return rows.filter((row) => row.planVersion > 1);
    }

    return rows;
  }

  findById(
    businessId: string,
    id: string,
  ): Promise<ClientMembershipDetailRow | null> {
    return this.prisma.clientMembership.findFirst({
      where: { businessId, id },
      include: detailInclude,
    });
  }

  findActiveForContact(
    businessId: string,
    contactId: string,
  ): Promise<ClientMembershipDetailRow[]> {
    return this.prisma.clientMembership.findMany({
      where: {
        businessId,
        contactId,
        status: { in: ACTIVE_STATUSES },
      },
      include: detailInclude,
    });
  }

  findByStripeSubscription(
    stripeSubscriptionId: string,
  ): Promise<ClientMembershipDetailRow | null> {
    return this.prisma.clientMembership.findFirst({
      where: { stripeSubscriptionId },
      include: detailInclude,
    });
  }

  findActiveOnPlan(
    businessId: string,
    contactId: string,
    planId: string,
  ): Promise<ClientMembershipListRow | null> {
    return this.prisma.clientMembership.findFirst({
      where: {
        businessId,
        contactId,
        planId,
        status: { in: ACTIVE_STATUSES },
      },
      include: listInclude,
    });
  }

  create(
    data: Prisma.ClientMembershipCreateInput,
  ): Promise<ClientMembershipDetailRow> {
    return this.prisma.clientMembership.create({
      data,
      include: detailInclude,
    });
  }

  update(
    id: string,
    data: Prisma.ClientMembershipUpdateInput,
  ): Promise<ClientMembershipDetailRow> {
    return this.prisma.clientMembership.update({
      where: { id },
      data,
      include: detailInclude,
    });
  }

  billingEventExists(stripeInvoiceId: string): Promise<boolean> {
    return this.prisma.membershipBillingEvent
      .findFirst({ where: { stripeInvoiceId } })
      .then(Boolean);
  }
}
