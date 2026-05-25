import { Injectable } from '@nestjs/common';
import { Prisma, Service, ServiceStatus } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

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

  findMany(
    businessId: string,
    params: {
      skip: number;
      take: number;
      search?: string;
      status?: ServiceStatus;
    },
  ): Promise<{ items: Service[]; total: number }> {
    const where = this.activeWhere(businessId, {
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { category: { contains: params.search, mode: 'insensitive' } },
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
      }),
      this.prisma.service.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  create(
    businessId: string,
    data: {
      name: string;
      category?: string | null;
      description?: string | null;
      price?: Prisma.Decimal | null;
      status?: ServiceStatus;
    },
  ): Promise<Service> {
    return this.prisma.service.create({
      data: {
        business: { connect: { id: businessId } },
        name: data.name,
        category: data.category,
        description: data.description,
        price: data.price,
        status: data.status ?? ServiceStatus.ACTIVE,
      },
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.ServiceUpdateInput,
  ): Promise<Service | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.service.update({
      where: { id },
      data,
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
}
