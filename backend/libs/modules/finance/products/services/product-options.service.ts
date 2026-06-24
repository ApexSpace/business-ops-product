import { HttpStatus, Injectable } from '@nestjs/common';
import { ProductType } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CreateProductOptionDto,
  CreateProductOptionValueDto,
  ProductOptionResponseDto,
  UpdateProductOptionDto,
  UpdateProductOptionValueDto,
} from '../dto/product-option.dto';
import { ProductOptionRepository } from '../repositories/product-option.repository';
import { ProductRepository } from '../repositories/product.repository';
import { ProductVariantRegenerationService } from './product-variant-regeneration.service';

@Injectable()
export class ProductOptionsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly optionRepository: ProductOptionRepository,
    private readonly variantRegenerationService: ProductVariantRegenerationService,
    private readonly auditService: AuditService,
  ) {}

  async list(
    businessId: string,
    productId: string,
  ): Promise<ProductOptionResponseDto[]> {
    await this.assertVariableProduct(businessId, productId);
    const options = await this.optionRepository.findManyByProduct(
      businessId,
      productId,
    );
    return options.map((option) => ({
      id: option.id,
      productId: option.productId,
      name: option.name,
      sortOrder: option.sortOrder,
      values: option.values.map((value) => ({
        id: value.id,
        value: value.value,
        sortOrder: value.sortOrder,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
      })),
      createdAt: option.createdAt,
      updatedAt: option.updatedAt,
    }));
  }

  async createOption(
    businessId: string,
    productId: string,
    dto: CreateProductOptionDto,
    actor: RequestUser,
  ): Promise<ProductOptionResponseDto> {
    await this.assertVariableProduct(businessId, productId);
    const sortOrder =
      dto.sortOrder ??
      (await this.optionRepository.nextSortOrder(businessId, productId));

    const option = await this.optionRepository.create(businessId, {
      product: { connect: { id: productId } },
      name: dto.name.trim(),
      sortOrder,
    });

    await this.variantRegenerationService.regenerateVariants(
      businessId,
      productId,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product_option.created',
      entityType: 'ProductOption',
      entityId: option.id,
    });

    const created = await this.optionRepository.findById(businessId, option.id);
    return this.mapOption(created!);
  }

  async updateOption(
    businessId: string,
    productId: string,
    optionId: string,
    dto: UpdateProductOptionDto,
    actor: RequestUser,
  ): Promise<ProductOptionResponseDto> {
    await this.assertVariableProduct(businessId, productId);
    const option = await this.optionRepository.update(businessId, optionId, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    });
    if (!option || option.productId !== productId) {
      throw new AppException(
        ErrorCode.PRODUCT_OPTION_NOT_FOUND,
        'Product option not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.variantRegenerationService.regenerateVariants(
      businessId,
      productId,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product_option.updated',
      entityType: 'ProductOption',
      entityId: optionId,
    });

    return this.mapOption(
      (await this.optionRepository.findById(businessId, optionId))!,
    );
  }

  async removeOption(
    businessId: string,
    productId: string,
    optionId: string,
    actor: RequestUser,
  ): Promise<ProductOptionResponseDto> {
    await this.assertVariableProduct(businessId, productId);
    const existing = await this.optionRepository.findById(businessId, optionId);
    if (!existing || existing.productId !== productId) {
      throw new AppException(
        ErrorCode.PRODUCT_OPTION_NOT_FOUND,
        'Product option not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const option = await this.optionRepository.softDelete(businessId, optionId);
    await this.variantRegenerationService.regenerateVariants(
      businessId,
      productId,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product_option.deleted',
      entityType: 'ProductOption',
      entityId: optionId,
    });

    return {
      id: option!.id,
      productId: option!.productId,
      name: option!.name,
      sortOrder: option!.sortOrder,
      values: [],
      createdAt: option!.createdAt,
      updatedAt: option!.updatedAt,
    };
  }

  async createValue(
    businessId: string,
    productId: string,
    optionId: string,
    dto: CreateProductOptionValueDto,
    actor: RequestUser,
  ) {
    await this.assertVariableProduct(businessId, productId);
    const option = await this.optionRepository.findById(businessId, optionId);
    if (!option || option.productId !== productId) {
      throw new AppException(
        ErrorCode.PRODUCT_OPTION_NOT_FOUND,
        'Product option not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const sortOrder =
      dto.sortOrder ??
      (await this.optionRepository.nextValueSortOrder(businessId, optionId));

    const value = await this.optionRepository.createValue(businessId, {
      option: { connect: { id: optionId } },
      value: dto.value.trim(),
      sortOrder,
    });

    await this.variantRegenerationService.regenerateVariants(
      businessId,
      productId,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product_option_value.created',
      entityType: 'ProductOptionValue',
      entityId: value.id,
    });

    return {
      id: value.id,
      value: value.value,
      sortOrder: value.sortOrder,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }

  async updateValue(
    businessId: string,
    productId: string,
    optionId: string,
    valueId: string,
    dto: UpdateProductOptionValueDto,
    actor: RequestUser,
  ) {
    await this.assertVariableProduct(businessId, productId);
    const option = await this.optionRepository.findById(businessId, optionId);
    if (!option || option.productId !== productId) {
      throw new AppException(
        ErrorCode.PRODUCT_OPTION_NOT_FOUND,
        'Product option not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const value = await this.optionRepository.updateValue(businessId, valueId, {
      ...(dto.value !== undefined ? { value: dto.value.trim() } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    });
    if (!value || value.optionId !== optionId) {
      throw new AppException(
        ErrorCode.PRODUCT_OPTION_NOT_FOUND,
        'Product option value not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.variantRegenerationService.regenerateVariants(
      businessId,
      productId,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product_option_value.updated',
      entityType: 'ProductOptionValue',
      entityId: valueId,
    });

    return {
      id: value.id,
      value: value.value,
      sortOrder: value.sortOrder,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }

  async removeValue(
    businessId: string,
    productId: string,
    optionId: string,
    valueId: string,
    actor: RequestUser,
  ) {
    await this.assertVariableProduct(businessId, productId);
    const value = await this.optionRepository.findValueById(businessId, valueId);
    if (!value || value.optionId !== optionId) {
      throw new AppException(
        ErrorCode.PRODUCT_OPTION_NOT_FOUND,
        'Product option value not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const deleted = await this.optionRepository.softDeleteValue(
      businessId,
      valueId,
    );
    await this.variantRegenerationService.regenerateVariants(
      businessId,
      productId,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product_option_value.deleted',
      entityType: 'ProductOptionValue',
      entityId: valueId,
    });

    return {
      id: deleted!.id,
      value: deleted!.value,
      sortOrder: deleted!.sortOrder,
      createdAt: deleted!.createdAt,
      updatedAt: deleted!.updatedAt,
    };
  }

  private mapOption(
    option: NonNullable<
      Awaited<ReturnType<ProductOptionRepository['findById']>>
    >,
  ): ProductOptionResponseDto {
    return {
      id: option.id,
      productId: option.productId,
      name: option.name,
      sortOrder: option.sortOrder,
      values: option.values.map((value) => ({
        id: value.id,
        value: value.value,
        sortOrder: value.sortOrder,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
      })),
      createdAt: option.createdAt,
      updatedAt: option.updatedAt,
    };
  }

  private async assertVariableProduct(
    businessId: string,
    productId: string,
  ): Promise<void> {
    const product = await this.productRepository.findById(businessId, productId);
    if (!product) {
      throw new AppException(
        ErrorCode.PRODUCT_NOT_FOUND,
        'Product not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (product.productType !== ProductType.VARIABLE) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Options are only supported on variable products',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
