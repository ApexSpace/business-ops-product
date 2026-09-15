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
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  CreateResourceGroupDto,
  ReorderResourceGroupsDto,
  UpdateResourceGroupDto,
} from '../dto/resource-group.dto';
import { ResourceGroupsService } from '../services/resource-groups.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('resource-groups')
@ApiBearerAuth()
@Controller('resource-groups')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('resources')
export class ResourceGroupsController {
  constructor(private readonly groupsService: ResourceGroupsService) {}

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  list(@CurrentUser() user: RequestUser) {
    return this.groupsService.list(user.businessId!);
  }

  @Post()
  @BusinessRoles(...MEMBER_ROLES)
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateResourceGroupDto,
  ) {
    return this.groupsService.create(user.businessId!, dto, user);
  }

  @Patch(':id')
  @BusinessRoles(...MEMBER_ROLES)
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResourceGroupDto,
  ) {
    return this.groupsService.update(user.businessId!, id, dto, user);
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
    return this.groupsService.remove(user.businessId!, id, user);
  }

  @Post('reorder')
  @BusinessRoles(...MEMBER_ROLES)
  reorder(
    @CurrentUser() user: RequestUser,
    @Body() dto: ReorderResourceGroupsDto,
  ) {
    return this.groupsService.reorder(user.businessId!, dto, user);
  }
}
