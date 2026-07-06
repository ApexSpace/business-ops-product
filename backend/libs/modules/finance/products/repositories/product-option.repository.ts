import { Injectable } from '@nestjs/common';
import { Prisma, ProductOption } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const optionWithValuesInclude = {
  values: {
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.ProductOptionInclude;

export type ProductOptionWithValues = Prisma.ProductOptionGetPayload<{
  include: typeof optionWithValuesInclude;
}>;

@Injectable()
export class ProductOptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.ProductOptionWhereInput,
  ): Prisma.ProductOptionWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  findById(
    businessId: string,
    id: string,
  ): Promise<ProductOptionWithValues | null> {
    return this.prisma.productOption.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: optionWithValuesInclude,
    });
  }

  findManyByProduct(
    businessId: string,
    productId: string,
  ): Promise<ProductOptionWithValues[]> {
    return this.prisma.productOption.findMany({
      where: this.activeWhere(businessId, { productId }),
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: optionWithValuesInclude,
    });
  }

  async nextSortOrder(businessId: string, productId: string): Promise<number> {
    const max = await this.prisma.productOption.aggregate({
      where: this.activeWhere(businessId, { productId }),
      _max: { sortOrder: true },
    });
    return (max._max.sortOrder ?? -1) + 1;
  }

  create(
    businessId: string,
    data: Prisma.ProductOptionCreateWithoutBusinessInput,
  ): Promise<ProductOption> {
    return this.prisma.productOption.create({
      data: {
        business: { connect: { id: businessId } },
        ...data,
      },
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.ProductOptionUpdateInput,
  ): Promise<ProductOption | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.productOption.update({ where: { id }, data });
  }

  async softDelete(
    businessId: string,
    id: string,
  ): Promise<ProductOption | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.productOption.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  createValue(
    businessId: string,
    data: Prisma.ProductOptionValueCreateWithoutBusinessInput,
  ) {
    return this.prisma.productOptionValue.create({
      data: {
        business: { connect: { id: businessId } },
        ...data,
      },
    });
  }

  findValueById(businessId: string, id: string) {
    return this.prisma.productOptionValue.findFirst({
      where: { businessId, id, deletedAt: null },
    });
  }

  async updateValue(
    businessId: string,
    id: string,
    data: Prisma.ProductOptionValueUpdateInput,
  ) {
    const existing = await this.findValueById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.productOptionValue.update({ where: { id }, data });
  }

  async softDeleteValue(businessId: string, id: string) {
    const existing = await this.findValueById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.productOptionValue.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async nextValueSortOrder(
    businessId: string,
    optionId: string,
  ): Promise<number> {
    const max = await this.prisma.productOptionValue.aggregate({
      where: { businessId, optionId, deletedAt: null },
      _max: { sortOrder: true },
    });
    return (max._max.sortOrder ?? -1) + 1;
  }
}
