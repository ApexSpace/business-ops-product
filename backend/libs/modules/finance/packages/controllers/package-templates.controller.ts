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
  CreatePackageTemplateDto,
  CreateServiceGroupDto,
  ReorderPackageTemplatesDto,
  UpdatePackageTemplateDto,
  UpdateServiceGroupDto,
} from '../dto/package.dto';
import { PackageTemplatesService } from '../services/package-templates.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('package-templates')
@ApiBearerAuth()
@Controller('package-templates')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('packages')
@StaffPermission('packages.access')
export class PackageTemplatesController {
  constructor(private readonly templatesService: PackageTemplatesService) {}

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  findAll(@CurrentUser() user: RequestUser) {
    return this.templatesService.findAll(user.businessId!);
  }

  @Post('reorder')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('packages.manage')
  reorder(
    @CurrentUser() user: RequestUser,
    @Body() dto: ReorderPackageTemplatesDto,
  ) {
    return this.templatesService.reorder(user.businessId!, dto, user);
  }

  @Post()
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('packages.manage')
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePackageTemplateDto,
  ) {
    return this.templatesService.create(user.businessId!, dto, user);
  }

  @Get(':id')
  @BusinessRoles(...MEMBER_ROLES)
  findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templatesService.findOne(user.businessId!, id);
  }

  @Patch(':id')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('packages.manage')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePackageTemplateDto,
  ) {
    return this.templatesService.update(user.businessId!, id, dto, user);
  }

  @Delete(':id')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('packages.manage')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templatesService.remove(user.businessId!, id, user);
  }

  @Post(':id/service-groups')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('packages.manage')
  addServiceGroup(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateServiceGroupDto,
  ) {
    return this.templatesService.addServiceGroup(
      user.businessId!,
      id,
      dto,
      user,
    );
  }

  @Patch(':id/service-groups/:groupId')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('packages.manage')
  updateServiceGroup(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: UpdateServiceGroupDto,
  ) {
    return this.templatesService.updateServiceGroup(
      user.businessId!,
      id,
      groupId,
      dto,
      user,
    );
  }

  @Delete(':id/service-groups/:groupId')
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('packages.manage')
  removeServiceGroup(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.templatesService.removeServiceGroup(
      user.businessId!,
      id,
      groupId,
      user,
    );
  }
}
