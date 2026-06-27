import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import {
  UpdateMembershipPreferencesDto,
  UpdateMembershipSettingsOnlineSalesDto,
} from '../dto/membership.dto';
import { MembershipSettingsService } from '../services/membership-settings.service';

const MEMBER_ROLES = [
  BusinessMemberRole.OWNER,
  BusinessMemberRole.ADMIN,
  BusinessMemberRole.MEMBER,
] as const;

@ApiTags('membership-settings')
@ApiBearerAuth()
@Controller('memberships/settings')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('payments')
export class MembershipSettingsController {
  constructor(private readonly settingsService: MembershipSettingsService) {}

  @Get()
  @BusinessRoles(...MEMBER_ROLES)
  getSettings(@CurrentUser() user: RequestUser) {
    return this.settingsService.getSettings(user.businessId!);
  }

  @Patch('preferences')
  @BusinessRoles(...MEMBER_ROLES)
  updatePreferences(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateMembershipPreferencesDto,
  ) {
    return this.settingsService.updatePreferences(user.businessId!, dto);
  }

  @Patch('online-sales')
  @BusinessRoles(...MEMBER_ROLES)
  updateOnlineSales(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateMembershipSettingsOnlineSalesDto,
  ) {
    return this.settingsService.updateOnlineSales(user.businessId!, dto);
  }
}
