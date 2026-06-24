import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { ReplaceProductBundleItemsDto } from '../dto/product-bundle.dto';
import { ProductBundlesService } from '../services/product-bundles.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('product-bundles')
@ApiBearerAuth()
@Controller('products/:productId/bundle-items')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('products')
export class ProductBundlesController {
  constructor(private readonly bundlesService: ProductBundlesService) {}

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  list(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.bundlesService.list(user.businessId!, productId);
  }

  @Put()
  @BusinessRoles(...MEMBER_ROLES)
  replace(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: ReplaceProductBundleItemsDto,
  ) {
    return this.bundlesService.replaceItems(
      user.businessId!,
      productId,
      dto,
      user,
    );
  }
}
