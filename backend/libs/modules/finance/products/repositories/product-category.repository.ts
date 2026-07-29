import { Injectable } from '@nestjs/common';
import { Prisma, ProductCategory, ProductStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class ProductCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.ProductCategoryWhereInput,
  ): Prisma.ProductCategoryWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  findById(businessId: string, id: string): Promise<ProductCategory | null> {
    return this.prisma.productCategory.findFirst({
      where: this.activeWhere(businessId, { id }),
    });
  }

  findManyOrdered(businessId: string): Promise<ProductCategory[]> {
    return this.prisma.productCategory.findMany({
      where: this.activeWhere(businessId),
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  countActiveProducts(businessId: string, categoryId: string): Promise<number> {
    return this.prisma.product.count({
      where: {
        businessId,
        categoryId,
        deletedAt: null,
      },
    });
  }

  async nextSortOrder(businessId: string): Promise<number> {
    const max = await this.prisma.productCategory.aggregate({
      where: this.activeWhere(businessId),
      _max: { sortOrder: true },
    });
    return (max._max.sortOrder ?? -1) + 1;
  }

  create(
    businessId: string,
    data: {
      name: string;
      isNonRetail?: boolean;
      sortOrder: number;
    },
  ): Promise<ProductCategory> {
    return this.prisma.productCategory.create({
      data: {
        business: { connect: { id: businessId } },
        name: data.name,
        isNonRetail: data.isNonRetail ?? false,
        sortOrder: data.sortOrder,
      },
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.ProductCategoryUpdateInput,
  ): Promise<ProductCategory | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.productCategory.update({ where: { id }, data });
  }

  async softDelete(
    businessId: string,
    id: string,
  ): Promise<ProductCategory | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.productCategory.update({
      where: { id },
      data: { deletedAt: new Date(), status: ProductStatus.ARCHIVED },
    });
  }

  async reorder(
    businessId: string,
    orderedIds: string[],
  ): Promise<ProductCategory[]> {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.productCategory.updateMany({
          where: { id, businessId, deletedAt: null },
          data: { sortOrder: index },
        }),
      ),
    );
    return this.findManyOrdered(businessId);
  }
}
