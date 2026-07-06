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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  CreateServiceCategoryDto,
  ReorderServiceCategoriesDto,
  UpdateServiceCategoryDto,
} from '../dto/service-category.dto';
import { ServiceCategoriesService } from '../services/service-categories.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('service-categories')
@ApiBearerAuth()
@Controller('service-categories')
@UseGuards(BusinessRolesGuard)
export class ServiceCategoriesController {
  constructor(private readonly categoriesService: ServiceCategoriesService) {}

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  list(@CurrentUser() user: RequestUser) {
    return this.categoriesService.list(user.businessId!);
  }

  @Post()
  @BusinessRoles(...MEMBER_ROLES)
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateServiceCategoryDto,
  ) {
    return this.categoriesService.create(user.businessId!, dto, user);
  }

  @Patch(':id')
  @BusinessRoles(...MEMBER_ROLES)
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceCategoryDto,
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
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    return this.categoriesService.remove(user.businessId!, id, user);
  }

  @Post('reorder')
  @BusinessRoles(...MEMBER_ROLES)
  reorder(
    @CurrentUser() user: RequestUser,
    @Body() dto: ReorderServiceCategoriesDto,
  ) {
    return this.categoriesService.reorder(user.businessId!, dto, user);
  }
}
