import { HttpStatus, Injectable } from '@nestjs/common';
import { FileAssetStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { FileAssetRepository } from '@app/modules/storage/repositories/file-asset.repository';
import { StorageService } from '@app/modules/storage/services/storage.service';
import { SignedDownloadResponseDto } from '@app/modules/storage/dto/signed-download-response.dto';
import { MAX_PRODUCT_GALLERY_IMAGES } from '../constants/product.constants';
import {
  AddProductGalleryImageDto,
  ProductFeaturedImageResponseDto,
  ProductImageResponseDto,
  ReorderProductImagesDto,
  SetProductFeaturedImageDto,
  UpdateProductGalleryImageDto,
} from '../dto/product-image.dto';
import { ProductImageRepository } from '../repositories/product-image.repository';
import { ProductRepository } from '../repositories/product.repository';
import { validateProductImage } from '../utils/product-image-validation.util';

@Injectable()
export class ProductImagesService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly imageRepository: ProductImageRepository,
    private readonly fileAssetRepository: FileAssetRepository,
    private readonly storageService: StorageService,
    private readonly auditService: AuditService,
  ) {}

  async listGallery(
    businessId: string,
    productId: string,
  ): Promise<ProductImageResponseDto[]> {
    await this.assertProduct(businessId, productId);
    const images = await this.imageRepository.findManyByProduct(
      businessId,
      productId,
    );
    return Promise.all(
      images.map((image) =>
        this.toImageResponseWithDownloadUrl(businessId, image),
      ),
    );
  }

  async getFeatured(
    businessId: string,
    productId: string,
  ): Promise<ProductFeaturedImageResponseDto> {
    const product = await this.assertProduct(businessId, productId);
    const response: ProductFeaturedImageResponseDto = {
      featuredImageKey: product.featuredImageKey,
      featuredImageMimeType: product.featuredImageMimeType,
      featuredImageWidth: product.featuredImageWidth,
      featuredImageHeight: product.featuredImageHeight,
      downloadUrl: null,
      expiresIn: null,
    };

    if (product.featuredImageKey) {
      const signed = await this.resolveDownloadUrl(
        businessId,
        product.featuredImageKey,
      );
      response.downloadUrl = signed.downloadUrl;
      response.expiresIn = signed.expiresIn;
    }

    return response;
  }

  async setFeatured(
    businessId: string,
    productId: string,
    dto: SetProductFeaturedImageDto,
    actor: RequestUser,
  ): Promise<ProductFeaturedImageResponseDto> {
    await this.assertProduct(businessId, productId);
    const dimensions = await this.validateFileAsset(
      businessId,
      dto.fileAssetId,
      actor,
    );

    const asset = await this.fileAssetRepository.findById(
      businessId,
      dto.fileAssetId,
    );

    await this.productRepository.update(businessId, productId, {
      featuredImageKey: asset!.objectKey,
      featuredImageMimeType: asset!.mimeType,
      featuredImageWidth: dimensions.width,
      featuredImageHeight: dimensions.height,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product.featured_image_set',
      entityType: 'Product',
      entityId: productId,
    });

    return this.getFeatured(businessId, productId);
  }

  async getFeaturedDownloadUrl(
    businessId: string,
    productId: string,
  ): Promise<SignedDownloadResponseDto> {
    const product = await this.assertProduct(businessId, productId);
    if (!product.featuredImageKey) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Product has no featured image',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.resolveDownloadUrl(businessId, product.featuredImageKey);
  }

  async getGalleryImageDownloadUrl(
    businessId: string,
    productId: string,
    imageId: string,
  ): Promise<SignedDownloadResponseDto> {
    await this.assertProduct(businessId, productId);
    const image = await this.imageRepository.findById(businessId, imageId);
    if (!image || image.productId !== productId) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Product image not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.resolveDownloadUrl(businessId, image.storageKey);
  }

  async clearFeatured(
    businessId: string,
    productId: string,
    actor: RequestUser,
  ): Promise<ProductFeaturedImageResponseDto> {
    await this.assertProduct(businessId, productId);
    await this.productRepository.update(businessId, productId, {
      featuredImageKey: null,
      featuredImageMimeType: null,
      featuredImageWidth: null,
      featuredImageHeight: null,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product.featured_image_cleared',
      entityType: 'Product',
      entityId: productId,
    });

    return this.getFeatured(businessId, productId);
  }

  async addGalleryImage(
    businessId: string,
    productId: string,
    dto: AddProductGalleryImageDto,
    actor: RequestUser,
  ): Promise<ProductImageResponseDto> {
    await this.assertProduct(businessId, productId);
    const count = await this.imageRepository.countByProduct(
      businessId,
      productId,
    );
    if (count >= MAX_PRODUCT_GALLERY_IMAGES) {
      throw new AppException(
        ErrorCode.PRODUCT_IMAGE_LIMIT_EXCEEDED,
        `Product gallery cannot exceed ${MAX_PRODUCT_GALLERY_IMAGES} images`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const dimensions = await this.validateFileAsset(
      businessId,
      dto.fileAssetId,
      actor,
    );
    const asset = await this.fileAssetRepository.findById(
      businessId,
      dto.fileAssetId,
    );
    const sortOrder = await this.imageRepository.nextSortOrder(
      businessId,
      productId,
    );

    const image = await this.imageRepository.create(businessId, {
      product: { connect: { id: productId } },
      storageKey: asset!.objectKey,
      mimeType: asset!.mimeType,
      width: dimensions.width,
      height: dimensions.height,
      altText: dto.altText?.trim() || null,
      sortOrder,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product.gallery_image_added',
      entityType: 'ProductImage',
      entityId: image.id,
    });

    return this.toImageResponseWithDownloadUrl(businessId, image);
  }

  private async toImageResponseWithDownloadUrl(
    businessId: string,
    image: {
      id: string;
      productId: string;
      storageKey: string;
      mimeType: string;
      width: number;
      height: number;
      altText: string | null;
      sortOrder: number;
      createdAt: Date;
      updatedAt: Date;
    },
  ): Promise<ProductImageResponseDto> {
    const response = this.toImageResponse(image);
    const signed = await this.resolveDownloadUrl(businessId, image.storageKey);
    return {
      ...response,
      downloadUrl: signed.downloadUrl,
      expiresIn: signed.expiresIn,
    };
  }

  async updateGalleryImage(
    businessId: string,
    productId: string,
    imageId: string,
    dto: UpdateProductGalleryImageDto,
    actor: RequestUser,
  ): Promise<ProductImageResponseDto> {
    await this.assertProduct(businessId, productId);
    const image = await this.imageRepository.update(businessId, imageId, {
      ...(dto.altText !== undefined
        ? { altText: dto.altText?.trim() || null }
        : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    });
    if (!image || image.productId !== productId) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Product image not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product.gallery_image_updated',
      entityType: 'ProductImage',
      entityId: imageId,
    });

    return this.toImageResponse(image);
  }

  async removeGalleryImage(
    businessId: string,
    productId: string,
    imageId: string,
    actor: RequestUser,
  ): Promise<ProductImageResponseDto> {
    await this.assertProduct(businessId, productId);
    const image = await this.imageRepository.softDelete(businessId, imageId);
    if (!image || image.productId !== productId) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Product image not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product.gallery_image_deleted',
      entityType: 'ProductImage',
      entityId: imageId,
    });

    return this.toImageResponse(image);
  }

  async reorderGallery(
    businessId: string,
    productId: string,
    dto: ReorderProductImagesDto,
    actor: RequestUser,
  ): Promise<ProductImageResponseDto[]> {
    await this.assertProduct(businessId, productId);
    const images = await this.imageRepository.findManyByProduct(
      businessId,
      productId,
    );
    const imageIds = new Set(images.map((image) => image.id));
    if (
      dto.orderedIds.length !== images.length ||
      dto.orderedIds.some((id) => !imageIds.has(id))
    ) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'orderedIds must include every gallery image exactly once',
        HttpStatus.BAD_REQUEST,
      );
    }

    for (const [index, id] of dto.orderedIds.entries()) {
      await this.imageRepository.update(businessId, id, { sortOrder: index });
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product.gallery_images_reordered',
      entityType: 'Product',
      entityId: productId,
    });

    return this.listGallery(businessId, productId);
  }

  private async validateFileAsset(
    businessId: string,
    fileAssetId: string,
    actor: RequestUser,
  ) {
    let asset = await this.fileAssetRepository.findById(
      businessId,
      fileAssetId,
    );
    if (!asset) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'File not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (asset.status !== FileAssetStatus.READY) {
      await this.storageService.confirmBusinessUpload(
        businessId,
        fileAssetId,
        actor.id,
      );
      asset = await this.fileAssetRepository.findById(businessId, fileAssetId);
    }

    const buffer = await this.storageService.getObjectBytes(asset!.objectKey);
    return validateProductImage({
      mimeType: asset!.mimeType,
      size: asset!.size,
      buffer,
    });
  }

  private async resolveDownloadUrl(
    businessId: string,
    storageKey: string,
  ): Promise<SignedDownloadResponseDto> {
    const asset = await this.fileAssetRepository.findByObjectKey(
      businessId,
      storageKey,
    );
    if (asset) {
      return this.storageService.getDownloadUrl(businessId, asset.id);
    }

    return this.storageService.getDownloadUrlForObjectKey(storageKey);
  }

  private async assertProduct(businessId: string, productId: string) {
    const product = await this.productRepository.findById(
      businessId,
      productId,
    );
    if (!product) {
      throw new AppException(
        ErrorCode.PRODUCT_NOT_FOUND,
        'Product not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return product;
  }

  private toImageResponse(image: {
    id: string;
    productId: string;
    storageKey: string;
    mimeType: string;
    width: number;
    height: number;
    altText: string | null;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }): ProductImageResponseDto {
    return {
      id: image.id,
      productId: image.productId,
      storageKey: image.storageKey,
      mimeType: image.mimeType,
      width: image.width,
      height: image.height,
      altText: image.altText,
      sortOrder: image.sortOrder,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    };
  }
}
