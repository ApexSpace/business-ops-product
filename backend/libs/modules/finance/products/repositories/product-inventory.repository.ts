import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ProductInventoryAdjustment,
  ProductInventoryAdjustmentType,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class ProductInventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByProduct(
    businessId: string,
    productId: string,
    params: { skip?: number; take?: number; variantId?: string },
  ): Promise<ProductInventoryAdjustment[]> {
    return this.prisma.productInventoryAdjustment.findMany({
      where: {
        businessId,
        productId,
        ...(params.variantId ? { variantId: params.variantId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    });
  }

  findSaleForInvoiceItem(
    businessId: string,
    checkoutId: string,
    invoiceItemId: string,
  ): Promise<ProductInventoryAdjustment | null> {
    return this.prisma.productInventoryAdjustment.findFirst({
      where: {
        businessId,
        checkoutId,
        invoiceItemId,
        type: ProductInventoryAdjustmentType.SALE,
      },
    });
  }

  countByProduct(
    businessId: string,
    productId: string,
    variantId?: string,
  ): Promise<number> {
    return this.prisma.productInventoryAdjustment.count({
      where: {
        businessId,
        productId,
        ...(variantId ? { variantId } : {}),
      },
    });
  }

  create(
    businessId: string,
    data: {
      productId: string;
      variantId?: string | null;
      type: ProductInventoryAdjustmentType;
      quantityChange: number;
      note?: string | null;
      actorUserId?: string | null;
      checkoutId?: string | null;
      invoiceItemId?: string | null;
      appointmentId?: string | null;
      serviceId?: string | null;
    },
  ): Promise<ProductInventoryAdjustment> {
    return this.prisma.productInventoryAdjustment.create({
      data: {
        businessId,
        productId: data.productId,
        variantId: data.variantId ?? null,
        type: data.type,
        quantityChange: data.quantityChange,
        note: data.note ?? null,
        actorUserId: data.actorUserId ?? null,
        checkoutId: data.checkoutId ?? null,
        invoiceItemId: data.invoiceItemId ?? null,
        appointmentId: data.appointmentId ?? null,
        serviceId: data.serviceId ?? null,
      },
    });
  }

  async adjustStockInTransaction(
    businessId: string,
    params: {
      productId: string;
      variantId?: string | null;
      type: ProductInventoryAdjustmentType;
      quantityChange: number;
      note?: string | null;
      actorUserId?: string | null;
      checkoutId?: string | null;
      invoiceItemId?: string | null;
    },
  ): Promise<{ adjustment: ProductInventoryAdjustment; stockQuantity: number }> {
    return this.prisma.$transaction(async (tx) => {
      let stockQuantity = 0;

      if (params.variantId) {
        const variant = await tx.productVariant.findFirst({
          where: {
            id: params.variantId,
            businessId,
            productId: params.productId,
            deletedAt: null,
          },
        });
        if (!variant) {
          throw new Error('VARIANT_NOT_FOUND');
        }
        stockQuantity =
          params.type === ProductInventoryAdjustmentType.RECOUNT
            ? params.quantityChange
            : variant.stockQuantity + params.quantityChange;
        if (stockQuantity < 0) {
          throw new Error('INSUFFICIENT_STOCK');
        }
        await tx.productVariant.update({
          where: { id: params.variantId },
          data: { stockQuantity },
        });
      } else {
        const product = await tx.product.findFirst({
          where: { id: params.productId, businessId, deletedAt: null },
        });
        if (!product) {
          throw new Error('PRODUCT_NOT_FOUND');
        }
        stockQuantity =
          params.type === ProductInventoryAdjustmentType.RECOUNT
            ? params.quantityChange
            : product.stockQuantity + params.quantityChange;
        if (stockQuantity < 0) {
          throw new Error('INSUFFICIENT_STOCK');
        }
        await tx.product.update({
          where: { id: params.productId },
          data: { stockQuantity },
        });
      }

      const adjustment = await tx.productInventoryAdjustment.create({
        data: {
          businessId,
          productId: params.productId,
          variantId: params.variantId ?? null,
          type: params.type,
          quantityChange: params.quantityChange,
          note: params.note ?? null,
          actorUserId: params.actorUserId ?? null,
          checkoutId: params.checkoutId ?? null,
          invoiceItemId: params.invoiceItemId ?? null,
        },
      });

      return { adjustment, stockQuantity };
    });
  }

  async syncVariableProductStock(
    businessId: string,
    productId: string,
  ): Promise<number> {
    const sum = await this.prisma.productVariant.aggregate({
      where: { businessId, productId, deletedAt: null },
      _sum: { stockQuantity: true },
    });
    const stockQuantity = sum._sum.stockQuantity ?? 0;
    await this.prisma.product.update({
      where: { id: productId },
      data: { stockQuantity },
    });
    return stockQuantity;
  }
}
