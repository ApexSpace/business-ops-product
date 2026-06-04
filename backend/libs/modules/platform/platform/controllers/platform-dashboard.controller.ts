import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { PlatformDashboardStatsDto } from '../dto/platform-dashboard-stats.dto';
import { PlatformDashboardService } from '@app/modules/platform/platform/services/platform-dashboard.service';

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform/dashboard')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
)
export class PlatformDashboardController {
  constructor(
    private readonly platformDashboardService: PlatformDashboardService,
  ) {}

  @Get('stats')
  getStats(): Promise<PlatformDashboardStatsDto> {
    return this.platformDashboardService.getStats();
  }
}
