import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Product,
  ProductStatus,
  ProductType,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const listInclude = {
  category: { select: { id: true, name: true } },
} satisfies Prisma.ProductInclude;

export const productDetailInclude = {
  category: true,
  options: {
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      values: {
        where: { deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  },
  variants: {
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      optionValues: {
        include: {
          optionValue: {
            include: {
              option: true,
            },
          },
        },
      },
    },
  },
  images: {
    where: { deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  },
  bundleItemsAsBundle: {
    include: {
      componentProduct: {
        select: { id: true, name: true, productType: true, status: true },
      },
      componentVariant: {
        select: { id: true, variantKey: true, sku: true, status: true },
      },
    },
  },
  inventoryAdjustments: {
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      variant: { select: { id: true, variantKey: true, sku: true } },
      actor: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.ProductInclude;

export type ProductListItem = Prisma.ProductGetPayload<{
  include: typeof listInclude;
}>;

export type ProductDetail = Prisma.ProductGetPayload<{
  include: typeof productDetailInclude;
}>;

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.ProductWhereInput,
  ): Prisma.ProductWhereInput {
    return { businessId, deletedAt: null, ...extra };
  }

  findById(businessId: string, id: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: this.activeWhere(businessId, { id }),
    });
  }

  findByIdWithDetail(
    businessId: string,
    id: string,
  ): Promise<ProductDetail | null> {
    return this.prisma.product.findFirst({
      where: this.activeWhere(businessId, { id }),
      include: productDetailInclude,
    });
  }

  findMany(
    businessId: string,
    params: {
      skip: number;
      take: number;
      search?: string;
      status?: ProductStatus;
      categoryId?: string;
      productType?: ProductType;
    },
  ): Promise<{ items: ProductListItem[]; total: number }> {
    const where = this.activeWhere(businessId, {
      ...(params.status ? { status: params.status } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.productType ? { productType: params.productType } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { brand: { contains: params.search, mode: 'insensitive' } },
              { sku: { contains: params.search, mode: 'insensitive' } },
              { barcode: { contains: params.search, mode: 'insensitive' } },
              {
                category: {
                  name: { contains: params.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    });

    return Promise.all([
      this.prisma.product.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: listInclude,
      }),
      this.prisma.product.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  findManyForExport(businessId: string): Promise<ProductListItem[]> {
    return this.prisma.product.findMany({
      where: this.activeWhere(businessId),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: listInclude,
    });
  }

  async nextSortOrder(businessId: string, categoryId?: string | null): Promise<number> {
    const max = await this.prisma.product.aggregate({
      where: this.activeWhere(businessId, {
        ...(categoryId ? { categoryId } : {}),
      }),
      _max: { sortOrder: true },
    });
    return (max._max.sortOrder ?? -1) + 1;
  }

  create(
    businessId: string,
    data: Prisma.ProductCreateWithoutBusinessInput,
  ): Promise<Product> {
    return this.prisma.product.create({
      data: {
        business: { connect: { id: businessId } },
        ...data,
      },
    });
  }

  async update(
    businessId: string,
    id: string,
    data: Prisma.ProductUpdateInput,
  ): Promise<Product | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.product.update({ where: { id }, data });
  }

  async updateStockQuantity(
    businessId: string,
    id: string,
    stockQuantity: number,
  ): Promise<Product | null> {
    return this.update(businessId, id, { stockQuantity });
  }

  async softDelete(businessId: string, id: string): Promise<Product | null> {
    const existing = await this.findById(businessId, id);
    if (!existing) {
      return null;
    }
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: ProductStatus.ARCHIVED },
    });
  }
}
