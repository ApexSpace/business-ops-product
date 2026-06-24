import { Injectable } from '@nestjs/common';
import {
  ProductStatus,
  ProductType,
  ProductVariantStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { ProductPickerItemResponseDto } from '../dto/product.dto';
import { resolveProductPrice, resolveProductSku } from '../utils/product-price-resolver.util';

@Injectable()
export class ProductPickerService {
  constructor(private readonly prisma: PrismaService) {}

  async listSellable(
    businessId: string,
    search?: string,
  ): Promise<ProductPickerItemResponseDto[]> {
    const products = await this.prisma.product.findMany({
      where: {
        businessId,
        deletedAt: null,
        status: ProductStatus.ACTIVE,
        productType: { in: [ProductType.SIMPLE, ProductType.VARIABLE] },
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { brand: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        variants: {
          where: {
            deletedAt: null,
            status: ProductVariantStatus.ACTIVE,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            optionValues: {
              include: {
                optionValue: {
                  include: { option: true },
                },
              },
            },
          },
        },
      },
    });

    const rows: ProductPickerItemResponseDto[] = [];

    for (const product of products) {
      if (product.productType === ProductType.SIMPLE) {
        rows.push({
          productId: product.id,
          variantId: null,
          name: product.name,
          variantLabel: null,
          productType: product.productType,
          unitPrice: resolveProductPrice(product),
          sku: resolveProductSku(product),
          stockQuantity: product.stockQuantity,
          trackInventory: product.trackInventory,
          status: product.status,
        });
        continue;
      }

      for (const variant of product.variants) {
        const label = variant.optionValues
          .sort(
            (a, b) =>
              a.optionValue.option.sortOrder - b.optionValue.option.sortOrder ||
              a.optionValue.option.name.localeCompare(
                b.optionValue.option.name,
              ),
          )
          .map((link) => link.optionValue.value)
          .join(' / ');

        rows.push({
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          variantLabel: label || variant.variantKey,
          productType: product.productType,
          unitPrice: resolveProductPrice(product, variant),
          sku: resolveProductSku(product, variant),
          stockQuantity: variant.stockQuantity,
          trackInventory: product.trackInventory,
          status: product.status,
        });
      }
    }

    return rows;
  }
}
