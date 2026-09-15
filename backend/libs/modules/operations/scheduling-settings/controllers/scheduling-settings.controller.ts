import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { UpdateSchedulingSettingsDto } from '../dto/scheduling-settings.dto';
import { SchedulingSettingsService } from '../services/scheduling-settings.service';

@ApiTags('scheduling-settings')
@ApiBearerAuth()
@Controller('scheduling-settings')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('calendar')
export class SchedulingSettingsController {
  constructor(
    private readonly schedulingSettingsService: SchedulingSettingsService,
  ) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getSettings(@CurrentUser() user: RequestUser) {
    return this.schedulingSettingsService.getSettings(user.businessId!);
  }

  @Patch()
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateSettings(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateSchedulingSettingsDto,
  ) {
    return this.schedulingSettingsService.updateSettings(
      user.businessId!,
      dto,
      user,
    );
  }
}
