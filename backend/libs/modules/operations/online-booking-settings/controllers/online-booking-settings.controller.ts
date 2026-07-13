import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import {
  ReplaceBusinessHoursDto,
  ReplaceStaffWorkScheduleDto,
  UpdateOnlineBookingPreferencesDto,
  UpdateOnlineBookingSetupDto,
  UpdateOnlineBookingStaffSelectionDto,
} from '../dto/online-booking-settings.dto';
import { OnlineBookingSettingsService } from '../services/online-booking-settings.service';

@ApiTags('online-booking-settings')
@ApiBearerAuth()
@Controller('online-booking-settings')
@UseGuards(BusinessRolesGuard)
export class OnlineBookingSettingsController {
  constructor(private readonly settingsService: OnlineBookingSettingsService) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getSettings(@CurrentUser() user: RequestUser) {
    return this.settingsService.getSettings(user.businessId!);
  }

  @Patch('setup')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateSetup(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateOnlineBookingSetupDto,
  ) {
    return this.settingsService.updateSetup(user.businessId!, dto, user.id);
  }

  @Patch('preferences')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updatePreferences(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateOnlineBookingPreferencesDto,
  ) {
    return this.settingsService.updatePreferences(
      user.businessId!,
      dto,
      user.id,
    );
  }

  @Patch('staff-selection')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateStaffSelection(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateOnlineBookingStaffSelectionDto,
  ) {
    return this.settingsService.updateStaffSelection(
      user.businessId!,
      dto,
      user.id,
    );
  }

  @Get('business-hours')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getBusinessHours(@CurrentUser() user: RequestUser) {
    return this.settingsService.getBusinessHours(user.businessId!);
  }

  @Put('business-hours')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateBusinessHours(
    @CurrentUser() user: RequestUser,
    @Body() dto: ReplaceBusinessHoursDto,
  ) {
    return this.settingsService.updateBusinessHours(
      user.businessId!,
      dto,
      user.id,
    );
  }

  @Get('staff/:userId/work-schedule')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  getStaffWorkSchedule(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.settingsService.getStaffWorkSchedule(user.businessId!, userId);
  }

  @Put('staff/:userId/work-schedule')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateStaffWorkSchedule(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ReplaceStaffWorkScheduleDto,
  ) {
    return this.settingsService.updateStaffWorkSchedule(
      user.businessId!,
      userId,
      dto,
      user.id,
    );
  }
}
