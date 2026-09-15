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
import { PlatformMemberRole } from '@prisma/client';
import { ConfirmDeleteQueryDto } from '@app/common/dto/confirm-delete-query.dto';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { InternalBusinessService } from '@app/modules/platform/business/services/internal-business.service';
import { CreateWorkItemDto } from '../dto/create-work-item.dto';
import { ListWorkItemsQueryDto } from '../dto/list-work-items-query.dto';
import { UpdateWorkItemDto } from '../dto/update-work-item.dto';
import { WorkItemsService } from '@app/modules/operations/work-items/services/work-items.service';

const PLATFORM_WORK_ITEMS_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

@ApiTags('platform-work-items')
@ApiBearerAuth()
@Controller('platform/work-items')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(...PLATFORM_WORK_ITEMS_ROLES)
export class PlatformWorkItemsController {
  constructor(
    private readonly workItemsService: WorkItemsService,
    private readonly internalBusiness: InternalBusinessService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateWorkItemDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.workItemsService.create(businessId, dto, user);
  }

  @Get()
  async list(@Query() query: ListWorkItemsQueryDto) {
    const businessId = await this.internalBusiness.getId();
    return this.workItemsService.list(businessId, query);
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const businessId = await this.internalBusiness.getId();
    return this.workItemsService.getById(businessId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkItemDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.workItemsService.update(businessId, id, dto, user);
  }

  @Delete(':id')
  @ApiQuery({
    name: 'confirm',
    required: true,
    type: Boolean,
    description: 'Must be true to confirm deletion',
  })
  async remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() _query: ConfirmDeleteQueryDto,
  ) {
    const businessId = await this.internalBusiness.getId();
    return this.workItemsService.remove(businessId, id, user);
  }
}
