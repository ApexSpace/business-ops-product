import { Injectable } from '@nestjs/common';
import {
  BusinessCapability,
  BusinessCapabilityAssignmentStatus,
  BusinessCapabilitySource,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const capabilityInclude = {
  capability: {
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      status: true,
    },
  },
} satisfies Prisma.BusinessCapabilityInclude;

export type BusinessCapabilityWithDetails =
  Prisma.BusinessCapabilityGetPayload<{
    include: typeof capabilityInclude;
  }>;

@Injectable()
export class BusinessCapabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByBusinessId(
    businessId: string,
  ): Promise<BusinessCapabilityWithDetails[]> {
    return this.prisma.businessCapability.findMany({
      where: { businessId },
      include: capabilityInclude,
      orderBy: [{ source: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findByBusinessAndCapability(
    businessId: string,
    capabilityId: string,
  ): Promise<BusinessCapability | null> {
    return this.prisma.businessCapability.findUnique({
      where: {
        businessId_capabilityId: { businessId, capabilityId },
      },
    });
  }

  upsert(data: {
    businessId: string;
    capabilityId: string;
    source: BusinessCapabilitySource;
    status?: BusinessCapabilityAssignmentStatus;
  }): Promise<BusinessCapabilityWithDetails> {
    return this.prisma.businessCapability.upsert({
      where: {
        businessId_capabilityId: {
          businessId: data.businessId,
          capabilityId: data.capabilityId,
        },
      },
      create: {
        businessId: data.businessId,
        capabilityId: data.capabilityId,
        source: data.source,
        status: data.status ?? BusinessCapabilityAssignmentStatus.ACTIVE,
      },
      update: {
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: capabilityInclude,
    });
  }

  update(
    id: string,
    data: Prisma.BusinessCapabilityUpdateInput,
  ): Promise<BusinessCapabilityWithDetails> {
    return this.prisma.businessCapability.update({
      where: { id },
      data,
      include: capabilityInclude,
    });
  }

  deletePlanTierSourcedNotIn(
    businessId: string,
    capabilityIds: string[],
  ): Promise<number> {
    const result = this.prisma.businessCapability.deleteMany({
      where: {
        businessId,
        source: BusinessCapabilitySource.PLAN_TIER,
        ...(capabilityIds.length > 0
          ? { capabilityId: { notIn: capabilityIds } }
          : {}),
      },
    });
    return result.then((r) => r.count);
  }

  deleteById(id: string): Promise<void> {
    return this.prisma.businessCapability
      .delete({ where: { id } })
      .then(() => undefined);
  }
}
