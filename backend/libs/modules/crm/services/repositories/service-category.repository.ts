import { Injectable } from '@nestjs/common';
import { Prisma, ServiceCategory, ServiceStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class ServiceCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.ServiceCategoryWhereInput,
  ): Prisma.ServiceCategoryWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  findById(businessId: string, id: string): Promise<ServiceCategory | null> {
    return this.prisma.serviceCategory.findFirst({
      where: this.activeWhere(businessId, { id }),
    });
  }

  findManyOrdered(businessId: string): Promise<ServiceCategory[]> {
    return this.prisma.serviceCategory.findMany({
      where: this.activeWhere(businessId),
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  countActiveServices(businessId: string, categoryId: string): Promise<number> {
    return this.prisma.service.count({
      where: {
        businessId,
        categoryId,
        deletedAt: null,
      },
    });
  }

  async nextSortOrder(businessId: string): Promise<number> {
    const max = await this.prisma.serviceCategory.aggregate({
      where: this.activeWhere(businessId),
      _max: { sortOrder: true },
    });
    return (max._max.sortOrder ?? -1) + 1;
  }

  create(
    businessId: string,
    data: { name: string; description?: string | null; sortOrder: number },
  ): Promise<ServiceCategory> {
    return this.prisma.serviceCategory.create({
      data: {
        business: { connect: { id: businessId } },
        name: data.name,
        description: data.description,
        sortOrder: data.sortOrder,
      },
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.ServiceCategoryUpdateInput,
  ): Promise<ServiceCategory | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.serviceCategory.update({ where: { id }, data });
  }

  async softDelete(
    businessId: string,
    id: string,
  ): Promise<ServiceCategory | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.serviceCategory.update({
      where: { id },
      data: { deletedAt: new Date(), status: ServiceStatus.ARCHIVED },
    });
  }

  async reorder(
    businessId: string,
    orderedIds: string[],
  ): Promise<ServiceCategory[]> {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.serviceCategory.updateMany({
          where: { id, businessId, deletedAt: null },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.findManyOrdered(businessId);
  }
}
