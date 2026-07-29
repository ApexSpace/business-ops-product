import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import {
  CampaignExtendDto,
  CampaignMembersPatchDto,
  CampaignMigrateDto,
  CampaignNotifyDto,
  CreateCampaignDto,
  ListCampaignsQueryDto,
} from '../dto/operations-campaign.dto';
import { OperationsCampaignService } from '../services/operations-campaign.service';

const READ_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

const WRITE_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
] as const;

@ApiTags('platform-operations')
@ApiBearerAuth()
@Controller('platform/operations')
@UseGuards(PlatformRolesGuard)
export class PlatformOperationsController {
  constructor(private readonly campaigns: OperationsCampaignService) {}

  @Get('campaigns')
  @PlatformRoles(...READ_ROLES)
  list(@Query() query: ListCampaignsQueryDto) {
    return this.campaigns.list(query);
  }

  @Get('campaigns/:id')
  @PlatformRoles(...READ_ROLES)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.campaigns.getById(id);
  }

  @Post('campaigns')
  @PlatformRoles(...WRITE_ROLES)
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: RequestUser) {
    return this.campaigns.createCampaign(dto, user);
  }

  @Post('campaigns/:id/notify')
  @PlatformRoles(...WRITE_ROLES)
  notify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CampaignNotifyDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaigns.notify(id, dto, user);
  }

  @Post('campaigns/:id/extend')
  @PlatformRoles(...WRITE_ROLES)
  extend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CampaignExtendDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaigns.extend(id, dto, user);
  }

  @Post('campaigns/:id/migrate')
  @PlatformRoles(...WRITE_ROLES)
  migrate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CampaignMigrateDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaigns.migrate(id, dto, user);
  }

  @Patch('campaigns/:id/members')
  @PlatformRoles(...WRITE_ROLES)
  patchMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CampaignMembersPatchDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.campaigns.patchMembers(id, dto, user);
  }
}
