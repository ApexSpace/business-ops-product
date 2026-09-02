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
  UpdateCancellationPolicyDto,
  UpdateLateCancellationDto,
  UpdateSelfServiceSettingsDto,
} from '../dto/cancel-reschedule-settings.dto';
import { CancelRescheduleSettingsService } from '../services/cancel-reschedule-settings.service';

@ApiTags('cancel-reschedule-settings')
@ApiBearerAuth()
@Controller('cancel-reschedule-settings')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('appointments')
export class CancelRescheduleSettingsController {
  constructor(
    private readonly settingsService: CancelRescheduleSettingsService,
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

  @Patch('cancellation-policy')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateCancellationPolicy(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateCancellationPolicyDto,
  ) {
    return this.settingsService.updateCancellationPolicy(
      user.businessId!,
      dto,
      user,
    );
  }

  @Patch('self-service')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateSelfService(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateSelfServiceSettingsDto,
  ) {
    return this.settingsService.updateSelfService(user.businessId!, dto, user);
  }

  @Patch('late-cancellation')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateLateCancellation(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateLateCancellationDto,
  ) {
    return this.settingsService.updateLateCancellation(
      user.businessId!,
      dto,
      user,
    );
  }
}
