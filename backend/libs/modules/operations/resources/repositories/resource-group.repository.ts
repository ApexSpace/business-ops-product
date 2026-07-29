import { Injectable } from '@nestjs/common';
import { Prisma, ResourceGroup } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class ResourceGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.ResourceGroupWhereInput,
  ): Prisma.ResourceGroupWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  findById(businessId: string, id: string): Promise<ResourceGroup | null> {
    return this.prisma.resourceGroup.findFirst({
      where: this.activeWhere(businessId, { id }),
    });
  }

  findManyOrdered(businessId: string): Promise<ResourceGroup[]> {
    return this.prisma.resourceGroup.findMany({
      where: this.activeWhere(businessId),
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  countResources(businessId: string, groupId: string): Promise<number> {
    return this.prisma.resource.count({
      where: { businessId, groupId, deletedAt: null },
    });
  }

  async nextSortOrder(businessId: string): Promise<number> {
    const max = await this.prisma.resourceGroup.aggregate({
      where: this.activeWhere(businessId),
      _max: { sortOrder: true },
    });
    return (max._max.sortOrder ?? -1) + 1;
  }

  create(
    businessId: string,
    data: { name: string; sortOrder: number },
  ): Promise<ResourceGroup> {
    return this.prisma.resourceGroup.create({
      data: {
        business: { connect: { id: businessId } },
        name: data.name,
        sortOrder: data.sortOrder,
      },
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.ResourceGroupUpdateInput,
  ): Promise<ResourceGroup | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.resourceGroup.update({ where: { id }, data });
  }

  async softDelete(
    businessId: string,
    id: string,
  ): Promise<ResourceGroup | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.resourceGroup.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async reorder(
    businessId: string,
    orderedIds: string[],
  ): Promise<ResourceGroup[]> {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.resourceGroup.updateMany({
          where: { id, businessId, deletedAt: null },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.findManyOrdered(businessId);
  }
}
