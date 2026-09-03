import { Injectable } from '@nestjs/common';
import { Prisma, Service, ServiceStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const listInclude = {
  category: { select: { id: true, name: true } },
} satisfies Prisma.ServiceInclude;

export type ServiceWithCategory = Prisma.ServiceGetPayload<{
  include: typeof listInclude;
}>;

@Injectable()
export class ServiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.ServiceWhereInput,
  ): Prisma.ServiceWhereInput {
    return {
      businessId,
      deletedAt: null,
      ...extra,
    };
  }

  findById(businessId: string, id: string): Promise<Service | null> {
    return this.prisma.service.findFirst({
      where: this.activeWhere(businessId, { id }),
    });
  }

  findByIdWithCategory(
    businessId: string,
    id: string,
  ): Promise<ServiceWithCategory | null> {
    return this.prisma.service.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: listInclude,
    });
  }

  findMany(
    businessId: string,
    params: {
      skip: number;
      take: number;
      search?: string;
      status?: ServiceStatus;
      categoryId?: string;
    },
  ): Promise<{ items: ServiceWithCategory[]; total: number }> {
    const where = this.activeWhere(businessId, {
      ...(params.status ? { status: params.status } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              {
                category: {
                  name: { contains: params.search, mode: 'insensitive' },
                },
              },
              {
                description: { contains: params.search, mode: 'insensitive' },
              },
            ],
          }
        : {}),
    });

    return Promise.all([
      this.prisma.service.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: listInclude,
      }),
      this.prisma.service.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  create(
    businessId: string,
    data: Prisma.ServiceCreateWithoutBusinessInput & {
      category: { connect: { id: string } };
    },
  ): Promise<Service> {
    return this.prisma.service.create({
      data: {
        business: { connect: { id: businessId } },
        ...data,
      },
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.ServiceUpdateInput,
  ): Promise<ServiceWithCategory | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.service.update({
      where: { id },
      data,
      include: listInclude,
    });
  }

  async softDelete(businessId: string, id: string): Promise<Service | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.service.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: ServiceStatus.ARCHIVED,
      },
    });
  }

  findManyOrderedByCategory(
    businessId: string,
    categoryId: string,
  ): Promise<ServiceWithCategory[]> {
    return this.prisma.service.findMany({
      where: this.activeWhere(businessId, { categoryId }),
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: listInclude,
    });
  }

  async reorderInCategory(
    businessId: string,
    categoryId: string,
    orderedIds: string[],
  ): Promise<ServiceWithCategory[]> {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.service.updateMany({
          where: { id, businessId, categoryId, deletedAt: null },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.findManyOrderedByCategory(businessId, categoryId);
  }
}
