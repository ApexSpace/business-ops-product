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
  CreateOptionGroupDto,
  CreateResourceRequirementDto,
  CreateServiceOptionDto,
  PatchServiceDetailsDto,
  PatchServiceOnlineBookingDto,
  ReplaceServiceProductsDto,
  ReplaceServiceStaffDto,
  ReorderIdsDto,
  ServiceStaffAssignmentDto,
  UpdateOptionGroupDto,
  UpdateResourceRequirementDto,
  UpdateServiceOptionDto,
} from '../dto/service-workspace.dto';
import { ServiceWorkspaceService } from '../services/service-workspace.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('services')
@ApiBearerAuth()
@Controller('services')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('services')
export class ServiceWorkspaceController {
  constructor(private readonly workspaceService: ServiceWorkspaceService) {}

  @Get('tree')
  @BusinessRoles(...MEMBER_ROLES)
  getTree(@CurrentUser() user: RequestUser) {
    return this.workspaceService.getTree(user.businessId!);
  }

  @Get(':id/workspace')
  @BusinessRoles(...MEMBER_ROLES)
  getWorkspace(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workspaceService.getWorkspace(user.businessId!, id);
  }

  @Patch(':id/details')
  @BusinessRoles(...MEMBER_ROLES)
  patchDetails(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchServiceDetailsDto,
  ) {
    return this.workspaceService.patchDetails(user.businessId!, id, dto, user);
  }

  @Put(':id/staff')
  @BusinessRoles(...MEMBER_ROLES)
  replaceStaff(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceServiceStaffDto,
  ) {
    return this.workspaceService.replaceStaff(user.businessId!, id, dto, user);
  }

  @Patch(':id/staff/:userId')
  @BusinessRoles(...MEMBER_ROLES)
  patchStaff(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ServiceStaffAssignmentDto,
  ) {
    return this.workspaceService.patchStaff(
      user.businessId!,
      id,
      userId,
      dto,
      user,
    );
  }

  @Get(':id/online-booking')
  @BusinessRoles(...MEMBER_ROLES)
  getOnlineBooking(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workspaceService.getOnlineBooking(user.businessId!, id);
  }

  @Patch(':id/online-booking')
  @BusinessRoles(...MEMBER_ROLES)
  patchOnlineBooking(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchServiceOnlineBookingDto,
  ) {
    return this.workspaceService.patchOnlineBooking(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Get(':id/online-booking/direct-link')
  @BusinessRoles(...MEMBER_ROLES)
  getDirectLink(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workspaceService.getDirectLinks(user.businessId!, id);
  }

  @Get(':id/resource-requirements')
  @BusinessRoles(...MEMBER_ROLES)
  listResourceRequirements(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workspaceService.listResourceRequirements(user.businessId!, id);
  }

  @Post(':id/resource-requirements')
  @BusinessRoles(...MEMBER_ROLES)
  createResourceRequirement(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateResourceRequirementDto,
  ) {
    return this.workspaceService.createResourceRequirement(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Patch(':id/resource-requirements/:reqId')
  @BusinessRoles(...MEMBER_ROLES)
  updateResourceRequirement(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reqId', ParseUUIDPipe) reqId: string,
    @Body() dto: UpdateResourceRequirementDto,
  ) {
    return this.workspaceService.updateResourceRequirement(
      user.businessId!,
      id,
      reqId,
      dto,
      user,
    );
  }

  @Delete(':id/resource-requirements/:reqId')
  @BusinessRoles(...MEMBER_ROLES)
  deleteResourceRequirement(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reqId', ParseUUIDPipe) reqId: string,
  ) {
    return this.workspaceService.deleteResourceRequirement(
      user.businessId!,
      id,
      reqId,
      user,
    );
  }

  @Get(':id/products')
  @BusinessRoles(...MEMBER_ROLES)
  listProducts(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workspaceService.listProducts(user.businessId!, id);
  }

  @Put(':id/products')
  @BusinessRoles(...MEMBER_ROLES)
  replaceProducts(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceServiceProductsDto,
  ) {
    return this.workspaceService.replaceProducts(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Post(':id/option-groups')
  @BusinessRoles(...MEMBER_ROLES)
  createOptionGroup(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOptionGroupDto,
  ) {
    return this.workspaceService.createOptionGroup(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Patch(':id/option-groups/:groupId')
  @BusinessRoles(...MEMBER_ROLES)
  updateOptionGroup(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: UpdateOptionGroupDto,
  ) {
    return this.workspaceService.updateOptionGroup(
      user.businessId!,
      id,
      groupId,
      dto,
      user,
    );
  }

  @Delete(':id/option-groups/:groupId')
  @BusinessRoles(...MEMBER_ROLES)
  deleteOptionGroup(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.workspaceService.deleteOptionGroup(
      user.businessId!,
      id,
      groupId,
      user,
    );
  }

  @Post(':id/option-groups/reorder')
  @BusinessRoles(...MEMBER_ROLES)
  reorderOptionGroups(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderIdsDto,
  ) {
    return this.workspaceService.reorderOptionGroups(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Post(':id/option-groups/:groupId/options')
  @BusinessRoles(...MEMBER_ROLES)
  createOption(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: CreateServiceOptionDto,
  ) {
    return this.workspaceService.createOption(
      user.businessId!,
      id,
      groupId,
      dto,
      user,
    );
  }

  @Patch(':id/option-groups/:groupId/options/:optionId')
  @BusinessRoles(...MEMBER_ROLES)
  updateOption(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('optionId', ParseUUIDPipe) optionId: string,
    @Body() dto: UpdateServiceOptionDto,
  ) {
    return this.workspaceService.updateOption(
      user.businessId!,
      id,
      groupId,
      optionId,
      dto,
      user,
    );
  }

  @Delete(':id/option-groups/:groupId/options/:optionId')
  @BusinessRoles(...MEMBER_ROLES)
  deleteOption(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('optionId', ParseUUIDPipe) optionId: string,
  ) {
    return this.workspaceService.deleteOption(
      user.businessId!,
      id,
      groupId,
      optionId,
      user,
    );
  }

  @Post(':id/option-groups/:groupId/options/reorder')
  @BusinessRoles(...MEMBER_ROLES)
  reorderOptions(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: ReorderIdsDto,
  ) {
    return this.workspaceService.reorderOptions(
      user.businessId!,
      id,
      groupId,
      dto,
      user,
    );
  }
}
