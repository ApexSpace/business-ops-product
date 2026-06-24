import { Injectable } from '@nestjs/common';
import { Prisma, ProductVariant, ProductVariantStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const variantWithOptionsInclude = {
  optionValues: {
    include: {
      optionValue: {
        include: { option: true },
      },
    },
  },
} satisfies Prisma.ProductVariantInclude;

export type ProductVariantWithOptions = Prisma.ProductVariantGetPayload<{
  include: typeof variantWithOptionsInclude;
}>;

@Injectable()
export class ProductVariantRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.ProductVariantWhereInput,
  ): Prisma.ProductVariantWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  findById(
    businessId: string,
    id: string,
  ): Promise<ProductVariantWithOptions | null> {
    return this.prisma.productVariant.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: variantWithOptionsInclude,
    });
  }

  findManyByProduct(
    businessId: string,
    productId: string,
  ): Promise<ProductVariantWithOptions[]> {
    return this.prisma.productVariant.findMany({
      where: this.activeWhere(businessId, { productId }),
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: variantWithOptionsInclude,
    });
  }

  findByProductAndKey(
    businessId: string,
    productId: string,
    variantKey: string,
  ): Promise<ProductVariant | null> {
    return this.prisma.productVariant.findFirst({
      where: this.activeWhere(businessId, { productId, variantKey }),
    });
  }

  create(
    businessId: string,
    data: Prisma.ProductVariantCreateWithoutBusinessInput,
  ): Promise<ProductVariant> {
    return this.prisma.productVariant.create({
      data: {
        business: { connect: { id: businessId } },
        ...data,
      },
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.ProductVariantUpdateInput,
  ): Promise<ProductVariant | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.productVariant.update({ where: { id }, data });
  }

  async softDelete(businessId: string, id: string): Promise<ProductVariant | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.productVariant.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: ProductVariantStatus.DISCONTINUED,
      },
    });
  }

  async softDeleteManyNotInKeys(
    businessId: string,
    productId: string,
    keepKeys: string[],
  ): Promise<void> {
    await this.prisma.productVariant.updateMany({
      where: {
        businessId,
        productId,
        deletedAt: null,
        ...(keepKeys.length > 0 ? { variantKey: { notIn: keepKeys } } : {}),
      },
      data: {
        deletedAt: new Date(),
        status: ProductVariantStatus.DISCONTINUED,
      },
    });
  }

  sumStockByProduct(businessId: string, productId: string): Promise<number> {
    return this.prisma.productVariant
      .aggregate({
        where: this.activeWhere(businessId, { productId }),
        _sum: { stockQuantity: true },
      })
      .then((result) => result._sum.stockQuantity ?? 0);
  }
}
