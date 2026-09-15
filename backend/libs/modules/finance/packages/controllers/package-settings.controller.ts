import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { StaffPermission } from '@app/common/decorators/staff-permission.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { UpdatePackageSettingsDto } from '../dto/package.dto';
import { PackageSettingsService } from '../services/package-settings.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('package-settings')
@ApiBearerAuth()
@Controller('package-settings')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('packages')
@StaffPermission('packages.access')
export class PackageSettingsController {
  constructor(private readonly settingsService: PackageSettingsService) {}

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  getSettings(@CurrentUser() user: RequestUser) {
    return this.settingsService.getOrCreateSettings(user.businessId!);
  }

  @Patch()
  @BusinessRoles(...MEMBER_ROLES)
  @StaffPermission('packages.manage')
  updateSettings(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdatePackageSettingsDto,
  ) {
    return this.settingsService.updateSettings(user.businessId!, dto);
  }
}
