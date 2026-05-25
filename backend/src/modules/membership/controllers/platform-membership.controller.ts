import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { PlatformRoles } from '../../../common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '../../../common/guards/platform-roles.guard';
import { MembershipService } from '../services/membership.service';

@ApiTags('platform')
@ApiBearerAuth()
@Controller('platform/businesses/:businessId/members')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
)
export class PlatformMembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get()
  list(@Param('businessId', ParseUUIDPipe) businessId: string) {
    return this.membershipService.listForPlatform(businessId);
  }
}
