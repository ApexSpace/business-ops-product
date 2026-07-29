import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  CreateProductOptionDto,
  CreateProductOptionValueDto,
  UpdateProductOptionDto,
  UpdateProductOptionValueDto,
} from '../dto/product-option.dto';
import { ProductOptionsService } from '../services/product-options.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('product-options')
@ApiBearerAuth()
@Controller('products/:productId/options')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('products')
@StaffPermission('products.access')
export class ProductOptionsController {
  constructor(private readonly optionsService: ProductOptionsService) {}

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  list(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.optionsService.list(user.businessId!, productId);
  }

  @Post()
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('products.manage')
  create(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateProductOptionDto,
  ) {
    return this.optionsService.createOption(
      user.businessId!,
      productId,
      dto,
      user,
    );
  }

  @Patch(':optionId')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('products.manage')
  update(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('optionId', ParseUUIDPipe) optionId: string,
    @Body() dto: UpdateProductOptionDto,
  ) {
    return this.optionsService.updateOption(
      user.businessId!,
      productId,
      optionId,
      dto,
      user,
    );
  }

  @Delete(':optionId')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('products.manage')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('optionId', ParseUUIDPipe) optionId: string,
  ) {
    return this.optionsService.removeOption(
      user.businessId!,
      productId,
      optionId,
      user,
    );
  }

  @Post(':optionId/values')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('products.manage')
  createValue(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('optionId', ParseUUIDPipe) optionId: string,
    @Body() dto: CreateProductOptionValueDto,
  ) {
    return this.optionsService.createValue(
      user.businessId!,
      productId,
      optionId,
      dto,
      user,
    );
  }

  @Patch(':optionId/values/:valueId')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('products.manage')
  updateValue(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('optionId', ParseUUIDPipe) optionId: string,
    @Param('valueId', ParseUUIDPipe) valueId: string,
    @Body() dto: UpdateProductOptionValueDto,
  ) {
    return this.optionsService.updateValue(
      user.businessId!,
      productId,
      optionId,
      valueId,
      dto,
      user,
    );
  }

  @Delete(':optionId/values/:valueId')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('products.manage')
  removeValue(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('optionId', ParseUUIDPipe) optionId: string,
    @Param('valueId', ParseUUIDPipe) valueId: string,
  ) {
    return this.optionsService.removeValue(
      user.businessId!,
      productId,
      optionId,
      valueId,
      user,
    );
  }
}
