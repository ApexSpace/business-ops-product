import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { buildJobOnlyAcceptedResponse } from '@app/common/utils/async-job-response.util';
import { JobEnqueueService } from '@app/core/jobs/job-enqueue.service';
import { GoogleCalendarSyncService } from './google-calendar-sync.service';

@ApiTags('calendars')
@ApiBearerAuth()
@Controller('calendars')
@UseGuards(BusinessRolesGuard)
export class GoogleCalendarSyncController {
  constructor(
    private readonly googleCalendarSyncService: GoogleCalendarSyncService,
    private readonly jobEnqueueService: JobEnqueueService,
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
  @HttpCode(HttpStatus.ACCEPTED)
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  async syncGoogle(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const asyncJob = await this.jobEnqueueService.enqueueCalendarSync({
      businessId: user.businessId!,
      calendarId: id,
      actorUserId: user.id,
      idempotencyKey,
    });
    return buildJobOnlyAcceptedResponse(asyncJob, user.businessId!);
  }
}
