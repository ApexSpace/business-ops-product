import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import {
  PlatformSettingsDto,
  UpdatePlatformSettingsDto,
} from '../dto/platform-settings.dto';
import { PlatformSettingsService } from '@app/modules/platform/platform/services/platform-settings.service';

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform/settings')
@UseGuards(PlatformRolesGuard)
export class PlatformSettingsController {
  constructor(
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  @Get()
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
    PlatformMemberRole.SUPPORT,
  )
  get(): Promise<PlatformSettingsDto> {
    return this.platformSettingsService.get();
  }

  @Patch()
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  update(
    @Body() dto: UpdatePlatformSettingsDto,
    @CurrentUser() user: RequestUser,
  ): Promise<PlatformSettingsDto> {
    return this.platformSettingsService.update(dto, user);
  }
}
