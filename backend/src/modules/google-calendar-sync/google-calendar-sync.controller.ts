import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/decorators/current-user.decorator';
import { BusinessRoles } from '../../common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '../../common/guards/business-roles.guard';
import { GoogleCalendarSyncService } from './google-calendar-sync.service';

@ApiTags('calendars')
@ApiBearerAuth()
@Controller('calendars')
@UseGuards(BusinessRolesGuard)
export class GoogleCalendarSyncController {
  constructor(
    private readonly googleCalendarSyncService: GoogleCalendarSyncService,
  ) {}

  @Get(':id/sync/status')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  getSyncStatus(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.googleCalendarSyncService.getSyncStatus(user.businessId!, id);
  }

  @Post(':id/sync/google')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  syncGoogle(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.googleCalendarSyncService.syncCalendar(
      user.businessId!,
      id,
      user.id,
    );
  }
}
