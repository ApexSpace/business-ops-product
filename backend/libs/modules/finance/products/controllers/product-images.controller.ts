import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  AddProductGalleryImageDto,
  ReorderProductImagesDto,
  SetProductFeaturedImageDto,
  UpdateProductGalleryImageDto,
} from '../dto/product-image.dto';
import { ProductImagesService } from '../services/product-images.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('product-images')
@ApiBearerAuth()
@Controller('products/:productId/images')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('products')
export class ProductImagesController {
  constructor(private readonly imagesService: ProductImagesService) {}

  @Get('featured/download-url')
  @BusinessRoles(...MEMBER_ROLES)
  getFeaturedDownloadUrl(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.imagesService.getFeaturedDownloadUrl(
      user.businessId!,
      productId,
    );
  }

  @Get('featured')
  @BusinessRoles(...MEMBER_ROLES)
  getFeatured(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.imagesService.getFeatured(user.businessId!, productId);
  }

  @Put('featured')
  @BusinessRoles(...MEMBER_ROLES)
  setFeatured(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: SetProductFeaturedImageDto,
  ) {
    return this.imagesService.setFeatured(
      user.businessId!,
      productId,
      dto,
      user,
    );
  }

  @Delete('featured')
  @BusinessRoles(...MEMBER_ROLES)
  clearFeatured(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.imagesService.clearFeatured(user.businessId!, productId, user);
  }

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  listGallery(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.imagesService.listGallery(user.businessId!, productId);
  }

  @Post()
  @BusinessRoles(...MEMBER_ROLES)
  addGalleryImage(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: AddProductGalleryImageDto,
  ) {
    return this.imagesService.addGalleryImage(
      user.businessId!,
      productId,
      dto,
      user,
    );
  }

  @Post('reorder')
  @BusinessRoles(...MEMBER_ROLES)
  reorderGallery(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: ReorderProductImagesDto,
  ) {
    return this.imagesService.reorderGallery(
      user.businessId!,
      productId,
      dto,
      user,
    );
  }

  @Get(':imageId/download-url')
  @BusinessRoles(...MEMBER_ROLES)
  getGalleryImageDownloadUrl(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.imagesService.getGalleryImageDownloadUrl(
      user.businessId!,
      productId,
      imageId,
    );
  }

  @Patch(':imageId')
  @BusinessRoles(...MEMBER_ROLES)
  updateGalleryImage(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() dto: UpdateProductGalleryImageDto,
  ) {
    return this.imagesService.updateGalleryImage(
      user.businessId!,
      productId,
      imageId,
      dto,
      user,
    );
  }

  @Delete(':imageId')
  @BusinessRoles(...MEMBER_ROLES)
  removeGalleryImage(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.imagesService.removeGalleryImage(
      user.businessId!,
      productId,
      imageId,
      user,
    );
  }
}
