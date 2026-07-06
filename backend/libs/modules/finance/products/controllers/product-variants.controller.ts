import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { UpdateProductVariantDto } from '../dto/product-variant.dto';
import { ProductVariantsService } from '../services/product-variants.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('product-variants')
@ApiBearerAuth()
@Controller('products/:productId/variants')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('products')
export class ProductVariantsController {
  constructor(private readonly variantsService: ProductVariantsService) {}

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  list(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.variantsService.list(user.businessId!, productId);
  }

  @Get(':variantId')
  @BusinessRoles(...MEMBER_ROLES)
  get(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ) {
    return this.variantsService.getById(user.businessId!, productId, variantId);
  }

  @Patch(':variantId')
  @BusinessRoles(...MEMBER_ROLES)
  update(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.variantsService.update(
      user.businessId!,
      productId,
      variantId,
      dto,
      user,
    );
  }
}
