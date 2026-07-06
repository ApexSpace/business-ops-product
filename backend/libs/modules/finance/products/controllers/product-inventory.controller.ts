import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
  CreateProductInventoryAdjustmentDto,
  ListProductInventoryQueryDto,
} from '../dto/product-inventory.dto';
import { ProductInventoryService } from '../services/product-inventory.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('product-inventory')
@ApiBearerAuth()
@Controller('products/:productId/inventory')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('products')
export class ProductInventoryController {
  constructor(private readonly inventoryService: ProductInventoryService) {}

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  getState(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ListProductInventoryQueryDto,
  ) {
    return this.inventoryService.getState(user.businessId!, productId, query);
  }

  @Post('adjustments')
  @BusinessRoles(...MEMBER_ROLES)
  adjust(
    @CurrentUser() user: RequestUser,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: CreateProductInventoryAdjustmentDto,
  ) {
    return this.inventoryService.adjust(user.businessId!, productId, dto, user);
  }
}
