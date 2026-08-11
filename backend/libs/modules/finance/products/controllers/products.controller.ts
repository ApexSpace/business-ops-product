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
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { SkipEnvelope } from '@app/common/decorators/skip-envelope.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  CreateProductDto,
  ListProductsQueryDto,
  UpdateProductDto,
} from '../dto/product.dto';
import { ProductExportService } from '../services/product-export.service';
import { ProductPickerService } from '../services/product-picker.service';
import { ProductsService } from '../services/products.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('products')
@StaffPermission('products.access')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly exportService: ProductExportService,
    private readonly pickerService: ProductPickerService,
  ) {}

  @Get('picker')
  @BusinessRoles(...MEMBER_ROLES)
  picker(@CurrentUser() user: RequestUser, @Query('search') search?: string) {
    return this.pickerService.listSellable(user.businessId!, search);
  }

  @Get('export')
  @SkipEnvelope()
  @BusinessRoles(...MEMBER_ROLES)
  @ApiProduces('text/csv')
  async export(@CurrentUser() user: RequestUser): Promise<StreamableFile> {
    const csv = await this.exportService.exportCsv(user.businessId!);
    return new StreamableFile(Buffer.from(csv, 'utf8'), {
      type: 'text/csv; charset=utf-8',
      disposition: 'attachment; filename="products.csv"',
    });
  }

  @Post()
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('products.manage')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.businessId!, dto, user);
  }

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  list(@CurrentUser() user: RequestUser, @Query() query: ListProductsQueryDto) {
    return this.productsService.list(user.businessId!, query);
  }

  @Get(':id')
  @BusinessRoles(...MEMBER_ROLES)
  get(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.getById(user.businessId!, id);
  }

  @Patch(':id')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('products.manage')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(user.businessId!, id, dto, user);
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
    return this.productsService.remove(user.businessId!, id, user);
  }
}
