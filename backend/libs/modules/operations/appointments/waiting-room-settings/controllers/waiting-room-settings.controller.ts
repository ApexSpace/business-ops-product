import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { RequireModule } from '@app/common/decorators/require-module.decorator';
import { BusinessCapabilityGuard } from '@app/common/guards/business-capability.guard';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { UpdateWaitingRoomSettingsDto } from '../dto/waiting-room-settings.dto';
import { WaitingRoomSettingsService } from '../services/waiting-room-settings.service';

@ApiTags('waiting-room-settings')
@ApiBearerAuth()
@Controller('waiting-room-settings')
@UseGuards(BusinessRolesGuard, BusinessCapabilityGuard)
@RequireModule('appointments')
export class WaitingRoomSettingsController {
  constructor(
    private readonly waitingRoomSettingsService: WaitingRoomSettingsService,
  ) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getSettings(@CurrentUser() user: RequestUser) {
    return this.waitingRoomSettingsService.getSettings(user.businessId!);
  }

  @Patch()
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  updateSettings(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateWaitingRoomSettingsDto,
  ) {
    return this.waitingRoomSettingsService.updateSettings(
      user.businessId!,
      dto,
      user,
    );
  }
}
