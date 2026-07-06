import { Injectable } from '@nestjs/common';
import { Prisma, ProductBundleItem } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const bundleItemInclude = {
  componentProduct: {
    select: { id: true, name: true, productType: true, status: true },
  },
  componentVariant: {
    select: { id: true, variantKey: true, sku: true, status: true },
  },
} satisfies Prisma.ProductBundleItemInclude;

export type ProductBundleItemWithRelations =
  Prisma.ProductBundleItemGetPayload<{
    include: typeof bundleItemInclude;
  }>;

@Injectable()
export class ProductBundleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByBundle(
    businessId: string,
    bundleProductId: string,
  ): Promise<ProductBundleItemWithRelations[]> {
    return this.prisma.productBundleItem.findMany({
      where: { businessId, bundleProductId },
      include: bundleItemInclude,
    });
  }

  async replaceBundleItems(
    businessId: string,
    bundleProductId: string,
    items: Array<{
      componentProductId: string;
      componentVariantId?: string | null;
      quantity: number;
    }>,
  ): Promise<ProductBundleItemWithRelations[]> {
    await this.prisma.$transaction([
      this.prisma.productBundleItem.deleteMany({
        where: { businessId, bundleProductId },
      }),
      ...items.map((item) =>
        this.prisma.productBundleItem.create({
          data: {
            business: { connect: { id: businessId } },
            bundleProduct: { connect: { id: bundleProductId } },
            componentProduct: { connect: { id: item.componentProductId } },
            ...(item.componentVariantId
              ? {
                  componentVariant: {
                    connect: { id: item.componentVariantId },
                  },
                }
              : {}),
            quantity: item.quantity,
          },
        }),
      ),
    ]);

    return this.findManyByBundle(businessId, bundleProductId);
  }
}
