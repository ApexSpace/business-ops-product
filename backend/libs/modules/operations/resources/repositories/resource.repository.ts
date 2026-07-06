import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Resource,
  ResourceAvailability,
  ResourceScheduleException,
  ResourceStatus,
  ServiceResourceType,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { DEFAULT_RESOURCE_WEEKLY_AVAILABILITY } from '../constants/default-resource-availability';
import { ResourceListRow } from '../mappers/resource.mapper';

const resourceInclude = {
  group: { select: { name: true } },
} satisfies Prisma.ResourceInclude;

@Injectable()
export class ResourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.ResourceWhereInput,
  ): Prisma.ResourceWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  findById(businessId: string, id: string): Promise<ResourceListRow | null> {
    return this.prisma.resource.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: resourceInclude,
    });
  }

  findMany(
    businessId: string,
    filters?: {
      groupId?: string;
      resourceType?: ServiceResourceType;
      search?: string;
    },
  ): Promise<ResourceListRow[]> {
    const search = filters?.search?.trim();
    return this.prisma.resource.findMany({
      where: this.activeWhere(businessId, {
        ...(filters?.groupId ? { groupId: filters.groupId } : {}),
        ...(filters?.resourceType
          ? { resourceType: filters.resourceType }
          : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      }),
      include: resourceInclude,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async nextSortOrder(
    businessId: string,
    groupId?: string | null,
  ): Promise<number> {
    const max = await this.prisma.resource.aggregate({
      where: this.activeWhere(businessId, {
        ...(groupId ? { groupId } : { groupId: null }),
      }),
      _max: { sortOrder: true },
    });
    return (max._max.sortOrder ?? -1) + 1;
  }

  async createWithDefaultAvailability(
    businessId: string,
    data: {
      name: string;
      resourceType: ServiceResourceType;
      groupId?: string | null;
      description?: string | null;
      sortOrder: number;
    },
  ): Promise<ResourceListRow> {
    return this.prisma.$transaction(async (tx) => {
      const resource = await tx.resource.create({
        data: {
          business: { connect: { id: businessId } },
          ...(data.groupId ? { group: { connect: { id: data.groupId } } } : {}),
          name: data.name,
          resourceType: data.resourceType,
          description: data.description ?? null,
          status: ResourceStatus.ACTIVE,
          sortOrder: data.sortOrder,
        },
        include: resourceInclude,
      });

      await tx.resourceAvailability.createMany({
        data: DEFAULT_RESOURCE_WEEKLY_AVAILABILITY.map((slot) => ({
          businessId,
          resourceId: resource.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isEnabled: slot.isEnabled,
        })),
      });

      return resource;
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.ResourceUpdateInput,
  ): Promise<ResourceListRow | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.resource.update({
      where: { id },
      data,
      include: resourceInclude,
    });
  }

  async softDelete(businessId: string, id: string): Promise<Resource | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.resource.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  listAvailability(
    businessId: string,
    resourceId: string,
  ): Promise<ResourceAvailability[]> {
    return this.prisma.resourceAvailability.findMany({
      where: { businessId, resourceId },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async replaceAvailability(
    businessId: string,
    resourceId: string,
    slots: Array<{
      dayOfWeek: ResourceAvailability['dayOfWeek'];
      startTime: string;
      endTime: string;
      isEnabled: boolean;
    }>,
  ): Promise<ResourceAvailability[]> {
    await this.prisma.$transaction([
      this.prisma.resourceAvailability.deleteMany({
        where: { businessId, resourceId },
      }),
      this.prisma.resourceAvailability.createMany({
        data: slots.map((slot) => ({
          businessId,
          resourceId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isEnabled: slot.isEnabled,
        })),
      }),
    ]);
    return this.listAvailability(businessId, resourceId);
  }

  listScheduleExceptions(
    businessId: string,
    resourceId: string,
  ): Promise<ResourceScheduleException[]> {
    return this.prisma.resourceScheduleException.findMany({
      where: { businessId, resourceId },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
  }

  createScheduleException(
    businessId: string,
    resourceId: string,
    data: {
      date: Date;
      startTime?: string | null;
      endTime?: string | null;
      isUnavailable?: boolean;
      reason?: string | null;
    },
  ): Promise<ResourceScheduleException> {
    return this.prisma.resourceScheduleException.create({
      data: {
        business: { connect: { id: businessId } },
        resource: { connect: { id: resourceId } },
        date: data.date,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
        isUnavailable: data.isUnavailable ?? true,
        reason: data.reason ?? null,
      },
    });
  }

  async deleteScheduleException(
    businessId: string,
    resourceId: string,
    exceptionId: string,
  ): Promise<boolean> {
    const result = await this.prisma.resourceScheduleException.deleteMany({
      where: { id: exceptionId, businessId, resourceId },
    });
    return result.count > 0;
  }

  countServiceRequirements(
    businessId: string,
    resourceId: string,
  ): Promise<number> {
    return this.prisma.serviceResourceRequirement.count({
      where: { businessId, resourceId },
    });
  }
}
