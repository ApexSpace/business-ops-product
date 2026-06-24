import { HttpStatus, Injectable } from '@nestjs/common';
import { ProductType } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  ProductBundleItemResponseDto,
  ReplaceProductBundleItemsDto,
} from '../dto/product-bundle.dto';
import { ProductBundleRepository } from '../repositories/product-bundle.repository';
import { ProductRepository } from '../repositories/product.repository';
import { ProductVariantRepository } from '../repositories/product-variant.repository';

@Injectable()
export class ProductBundlesService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly variantRepository: ProductVariantRepository,
    private readonly bundleRepository: ProductBundleRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(
    businessId: string,
    bundleProductId: string,
  ): Promise<ProductBundleItemResponseDto[]> {
    await this.assertBundleProduct(businessId, bundleProductId);
    const items = await this.bundleRepository.findManyByBundle(
      businessId,
      bundleProductId,
    );
    return items.map((item) => ({
      id: item.id,
      bundleProductId: item.bundleProductId,
      componentProductId: item.componentProductId,
      componentVariantId: item.componentVariantId,
      quantity: item.quantity,
      componentProductName: item.componentProduct?.name ?? null,
      componentVariantKey: item.componentVariant?.variantKey ?? null,
    }));
  }

  async replaceItems(
    businessId: string,
    bundleProductId: string,
    dto: ReplaceProductBundleItemsDto,
    actor: RequestUser,
  ): Promise<ProductBundleItemResponseDto[]> {
    await this.assertBundleProduct(businessId, bundleProductId);

    for (const item of dto.items) {
      if (item.componentProductId === bundleProductId) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Bundle cannot include itself as a component',
          HttpStatus.BAD_REQUEST,
        );
      }

      const component = await this.productRepository.findById(
        businessId,
        item.componentProductId,
      );
      if (!component) {
        throw new AppException(
          ErrorCode.PRODUCT_NOT_FOUND,
          'Component product not found',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (item.componentVariantId) {
        const variant = await this.variantRepository.findById(
          businessId,
          item.componentVariantId,
        );
        if (!variant || variant.productId !== item.componentProductId) {
          throw new AppException(
            ErrorCode.PRODUCT_VARIANT_NOT_FOUND,
            'Component variant not found',
            HttpStatus.BAD_REQUEST,
          );
        }
      } else if (component.productType === ProductType.VARIABLE) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'componentVariantId is required for variable component products',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const items = await this.bundleRepository.replaceBundleItems(
      businessId,
      bundleProductId,
      dto.items,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product_bundle.items_replaced',
      entityType: 'Product',
      entityId: bundleProductId,
    });

    return items.map((item) => ({
      id: item.id,
      bundleProductId: item.bundleProductId,
      componentProductId: item.componentProductId,
      componentVariantId: item.componentVariantId,
      quantity: item.quantity,
      componentProductName: item.componentProduct?.name ?? null,
      componentVariantKey: item.componentVariant?.variantKey ?? null,
    }));
  }

  private async assertBundleProduct(businessId: string, productId: string) {
    const product = await this.productRepository.findById(businessId, productId);
    if (!product) {
      throw new AppException(
        ErrorCode.PRODUCT_NOT_FOUND,
        'Product not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (product.productType !== ProductType.BUNDLE) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Bundle items are only supported on bundle products',
        HttpStatus.BAD_REQUEST,
      );
    }
    return product;
  }
}
