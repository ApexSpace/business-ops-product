import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  CreateProductCategoryDto,
  ReorderProductCategoriesDto,
  UpdateProductCategoryDto,
} from '../dto/product-category.dto';
import { ProductCategoriesService } from '../services/product-categories.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('product-categories')
@ApiBearerAuth()
@Controller('product-categories')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('products')
@StaffPermission('products.access')
export class ProductCategoriesController {
  constructor(private readonly categoriesService: ProductCategoriesService) {}

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  list(@CurrentUser() user: RequestUser) {
    return this.categoriesService.list(user.businessId!);
  }

  @Post()
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('products.manage')
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateProductCategoryDto,
  ) {
    return this.categoriesService.create(user.businessId!, dto, user);
  }

  @Patch(':id')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('products.manage')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductCategoryDto,
  ) {
    return this.categoriesService.update(user.businessId!, id, dto, user);
  }

  @Delete(':id')
  @BusinessRoles(...MEMBER_ROLES)
  @ApiQuery({
    name: 'confirm',
    required: true,
    type: Boolean,
    description: 'Must be true to confirm deletion',
  })
  @StaffPermission('products.manage')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    return this.categoriesService.remove(user.businessId!, id, user);
  }

  @Post('reorder')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('products.manage')
  reorder(
    @CurrentUser() user: RequestUser,
    @Body() dto: ReorderProductCategoriesDto,
  ) {
    return this.categoriesService.reorder(user.businessId!, dto, user);
  }
}
