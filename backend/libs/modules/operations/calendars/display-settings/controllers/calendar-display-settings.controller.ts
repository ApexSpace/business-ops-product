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
  UpdateCancelledVisibilityDto,
  UpdateHighContrastDto,
  UpdateVisibleHoursDto,
  UpdateWeekStartDto,
  UpdateZoomLevelDto,
} from '../dto/calendar-display-settings.dto';
import { CalendarDisplaySettingsService } from '../services/calendar-display-settings.service';

@ApiTags('calendar-display-settings')
@ApiBearerAuth()
@Controller('calendar-display-settings')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('calendar')
export class CalendarDisplaySettingsController {
  constructor(
    private readonly settingsService: CalendarDisplaySettingsService,
  ) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getSettings(@CurrentUser() user: RequestUser) {
    return this.settingsService.getSettings(user.businessId!);
  }

  @Patch('visible-hours')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateVisibleHours(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateVisibleHoursDto,
  ) {
    return this.settingsService.updateVisibleHours(
      user.businessId!,
      dto,
      user,
    );
  }

  @Patch('week-start')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateWeekStart(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateWeekStartDto,
  ) {
    return this.settingsService.updateWeekStart(user.businessId!, dto, user);
  }

  @Patch('zoom-level')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateZoomLevel(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateZoomLevelDto,
  ) {
    return this.settingsService.updateZoomLevel(user.businessId!, dto, user);
  }

  @Patch('cancelled-visibility')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateCancelledVisibility(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateCancelledVisibilityDto,
  ) {
    return this.settingsService.updateCancelledVisibility(
      user.businessId!,
      dto,
      user,
    );
  }

  @Patch('high-contrast')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateHighContrast(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateHighContrastDto,
  ) {
    return this.settingsService.updateHighContrast(user.businessId!, dto, user);
  }
}
