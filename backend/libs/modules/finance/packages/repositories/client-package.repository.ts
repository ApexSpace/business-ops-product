import { Injectable } from '@nestjs/common';
import { ClientPackageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const contactSelect = {
  id: true,
  firstName: true,
  lastName: true,
  displayName: true,
  email: true,
} as const;

const serviceSelect = {
  id: true,
  name: true,
} as const;

const listInclude = {
  contact: { select: contactSelect },
  packageTemplate: {
    select: {
      id: true,
      name: true,
      emoji: true,
      totalPrice: true,
    },
  },
  serviceAllocations: {
    include: { service: { select: serviceSelect } },
  },
} satisfies Prisma.ClientPackageInclude;

const detailInclude = {
  ...listInclude,
  history: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.ClientPackageInclude;

export type ClientPackageListRow = Prisma.ClientPackageGetPayload<{
  include: typeof listInclude;
}>;

export type ClientPackageDetailRow = Prisma.ClientPackageGetPayload<{
  include: typeof detailInclude;
}>;

@Injectable()
export class ClientPackageRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.ClientPackageWhereInput,
  ): Prisma.ClientPackageWhereInput {
    return {
      businessId,
      status: { not: ClientPackageStatus.DELETED },
      ...extra,
    };
  }

  async findMany(
    businessId: string,
    opts: { contactId?: string; search?: string },
  ): Promise<ClientPackageListRow[]> {
    const where = this.activeWhere(businessId);
    if (opts.contactId) {
      where.contactId = opts.contactId;
    }
    if (opts.search?.trim()) {
      const q = opts.search.trim();
      where.OR = [
        {
          packageTemplate: {
            name: { contains: q, mode: 'insensitive' },
          },
        },
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

    return this.prisma.clientPackage.findMany({
      where,
      include: listInclude,
      orderBy: { purchaseDate: 'desc' },
    });
  }

  findById(
    businessId: string,
    id: string,
  ): Promise<ClientPackageDetailRow | null> {
    return this.prisma.clientPackage.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: detailInclude,
    });
  }

  findByStripePaymentIntent(
    businessId: string,
    stripePaymentIntentId: string,
  ): Promise<ClientPackageDetailRow | null> {
    return this.prisma.clientPackage.findFirst({
      where: { businessId, stripePaymentIntentId },
      include: detailInclude,
    });
  }

  findActiveForContact(
    businessId: string,
    contactId: string,
  ): Promise<ClientPackageListRow[]> {
    return this.prisma.clientPackage.findMany({
      where: this.activeWhere(businessId, {
        contactId,
        status: ClientPackageStatus.ACTIVE,
      }),
      include: listInclude,
      orderBy: { purchaseDate: 'desc' },
    });
  }

  findExpiredActive(
    before: Date,
  ): Promise<{ id: string; businessId: string }[]> {
    return this.prisma.clientPackage.findMany({
      where: {
        status: ClientPackageStatus.ACTIVE,
        expirationDate: { lt: before },
      },
      select: { id: true, businessId: true },
    });
  }
}
