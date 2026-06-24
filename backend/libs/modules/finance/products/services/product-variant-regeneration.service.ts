import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Prisma,
  ProductStatus,
  ProductType,
  ProductVariantStatus,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { buildVariantCombinations } from '../utils/variant-combinations.util';
import { ProductInventoryRepository } from '../repositories/product-inventory.repository';
import { ProductOptionRepository } from '../repositories/product-option.repository';
import { ProductVariantRepository } from '../repositories/product-variant.repository';

@Injectable()
export class ProductVariantRegenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly optionRepository: ProductOptionRepository,
    private readonly variantRepository: ProductVariantRepository,
    private readonly inventoryRepository: ProductInventoryRepository,
  ) {}

  async regenerateVariants(businessId: string, productId: string): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId, deletedAt: null },
    });
    if (!product) {
      throw new AppException(
        ErrorCode.PRODUCT_NOT_FOUND,
        'Product not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (product.productType !== ProductType.VARIABLE) {
      return;
    }

    const options = await this.optionRepository.findManyByProduct(
      businessId,
      productId,
    );
    const combinations = buildVariantCombinations(options);
    const existingVariants = await this.variantRepository.findManyByProduct(
      businessId,
      productId,
    );
    const existingByKey = new Map(
      existingVariants.map((variant) => [variant.variantKey, variant]),
    );

    const keepKeys: string[] = [];

    for (const [index, combo] of combinations.entries()) {
      keepKeys.push(combo.variantKey);
      const existing = existingByKey.get(combo.variantKey);

      if (existing) {
        await this.prisma.productVariantOptionValue.deleteMany({
          where: { variantId: existing.id, businessId },
        });
        await this.prisma.productVariantOptionValue.createMany({
          data: combo.optionValueIds.map((optionValueId) => ({
            businessId,
            variantId: existing.id,
            optionValueId,
          })),
        });
        continue;
      }

      const created = await this.variantRepository.create(businessId, {
        product: { connect: { id: productId } },
        variantKey: combo.variantKey,
        price: product.unitPrice,
        purchaseCost: product.purchaseCost,
        stockQuantity: 0,
        sortOrder: index,
        status: ProductVariantStatus.ACTIVE,
        optionValues: {
          create: combo.optionValueIds.map((optionValueId) => ({
            business: { connect: { id: businessId } },
            optionValue: { connect: { id: optionValueId } },
          })),
        },
      });
      existingByKey.set(combo.variantKey, {
        ...created,
        optionValues: [],
      });
    }

    await this.variantRepository.softDeleteManyNotInKeys(
      businessId,
      productId,
      keepKeys,
    );

    await this.inventoryRepository.syncVariableProductStock(businessId, productId);
  }
}
