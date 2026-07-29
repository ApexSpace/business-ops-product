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
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  CreateResourceDto,
  ListResourcesQueryDto,
  UpdateResourceDto,
} from '../dto/resource.dto';
import {
  CreateResourceScheduleExceptionDto,
  ReplaceResourceAvailabilityDto,
} from '../dto/resource-workspace.dto';
import { ResourcesService } from '../services/resources.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('resources')
@ApiBearerAuth()
@Controller('resources')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('picker')
  @BusinessRoles(...MEMBER_ROLES)
  picker(@CurrentUser() user: RequestUser, @Query('search') search?: string) {
    return this.resourcesService.picker(user.businessId!, search);
  }

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListResourcesQueryDto,
  ) {
    return this.resourcesService.list(user.businessId!, query);
  }

  @Post()
  @BusinessRoles(...MEMBER_ROLES)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateResourceDto) {
    return this.resourcesService.create(user.businessId!, dto, user);
  }

  @Get(':id/workspace')
  @BusinessRoles(...MEMBER_ROLES)
  workspace(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.resourcesService.getWorkspace(user.businessId!, id);
  }

  @Get(':id/linked-services')
  @BusinessRoles(...MEMBER_ROLES)
  linkedServices(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.resourcesService
      .getWorkspace(user.businessId!, id)
      .then((workspace) => workspace.linkedServices);
  }

  @Get(':id/availability')
  @BusinessRoles(...MEMBER_ROLES)
  getAvailability(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.resourcesService
      .getWorkspace(user.businessId!, id)
      .then((workspace) => workspace.availability);
  }

  @Put(':id/availability')
  @BusinessRoles(...MEMBER_ROLES)
  replaceAvailability(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceResourceAvailabilityDto,
  ) {
    return this.resourcesService.replaceAvailability(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Get(':id/schedule-exceptions')
  @BusinessRoles(...MEMBER_ROLES)
  listScheduleExceptions(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.resourcesService
      .getWorkspace(user.businessId!, id)
      .then((workspace) => workspace.scheduleExceptions);
  }

  @Post(':id/schedule-exceptions')
  @BusinessRoles(...MEMBER_ROLES)
  createScheduleException(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateResourceScheduleExceptionDto,
  ) {
    return this.resourcesService.createScheduleException(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Delete(':id/schedule-exceptions/:exceptionId')
  @BusinessRoles(...MEMBER_ROLES)
  deleteScheduleException(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('exceptionId', ParseUUIDPipe) exceptionId: string,
  ) {
    return this.resourcesService.deleteScheduleException(
      user.businessId!,
      id,
      exceptionId,
      user,
    );
  }

  @Get(':id')
  @BusinessRoles(...MEMBER_ROLES)
  get(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.resourcesService.getById(user.businessId!, id);
  }

  @Patch(':id')
  @BusinessRoles(...MEMBER_ROLES)
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResourceDto,
  ) {
    return this.resourcesService.update(user.businessId!, id, dto, user);
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
    return this.resourcesService.remove(user.businessId!, id, user);
  }
}
