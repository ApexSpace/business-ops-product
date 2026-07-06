import { Injectable } from '@nestjs/common';
import { Prisma, ProductImage } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class ProductImageRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.ProductImageWhereInput,
  ): Prisma.ProductImageWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  findById(businessId: string, id: string): Promise<ProductImage | null> {
    return this.prisma.productImage.findFirst({
      where: this.activeWhere(businessId, { id }),
    });
  }

  findManyByProduct(
    businessId: string,
    productId: string,
  ): Promise<ProductImage[]> {
    return this.prisma.productImage.findMany({
      where: this.activeWhere(businessId, { productId }),
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  countByProduct(businessId: string, productId: string): Promise<number> {
    return this.prisma.productImage.count({
      where: this.activeWhere(businessId, { productId }),
    });
  }

  async nextSortOrder(businessId: string, productId: string): Promise<number> {
    const max = await this.prisma.productImage.aggregate({
      where: this.activeWhere(businessId, { productId }),
      _max: { sortOrder: true },
    });
    return (max._max.sortOrder ?? -1) + 1;
  }

  create(
    businessId: string,
    data: Prisma.ProductImageCreateWithoutBusinessInput,
  ): Promise<ProductImage> {
    return this.prisma.productImage.create({
      data: {
        business: { connect: { id: businessId } },
        ...data,
      },
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.ProductImageUpdateInput,
  ): Promise<ProductImage | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.productImage.update({ where: { id }, data });
  }

  async softDelete(
    businessId: string,
    id: string,
  ): Promise<ProductImage | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.productImage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
