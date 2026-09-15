import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { UpdateNotificationChannelPreferenceDto } from '../dto/notification-channel-preference.dto';
import { NotificationChannelPreferenceService } from '../services/notification-channel-preference.service';

@ApiTags('notification-channel-preferences')
@ApiBearerAuth()
@Controller('notification-channel-preferences')
@UseGuards(BusinessRolesGuard)
export class NotificationChannelPreferencesController {
  constructor(
    private readonly preferenceService: NotificationChannelPreferenceService,
  ) {}

  @Get()
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  list(@CurrentUser() user: RequestUser) {
    return this.preferenceService.listForBusiness(user.businessId!);
  }

  @Get(':notificationKey')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getOne(
    @CurrentUser() user: RequestUser,
    @Param('notificationKey') notificationKey: string,
  ) {
    return this.preferenceService.getPreference(
      user.businessId!,
      notificationKey,
    );
  }

  @Patch()
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  update(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateNotificationChannelPreferenceDto,
  ) {
    return this.preferenceService.setChannel(
      user.businessId!,
      dto.notificationKey,
      dto.channel,
    );
  }
}
