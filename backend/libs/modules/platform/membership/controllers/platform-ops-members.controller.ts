import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { InternalBusinessService } from '@app/modules/platform/business/services/internal-business.service';
import { ListMembersQueryDto } from '../dto/list-members-query.dto';
import { MembershipService } from '../services/membership.service';

const PLATFORM_OPS_MEMBERS_ROLES = [
  PlatformMemberRole.SUPER_ADMIN,
  PlatformMemberRole.PLATFORM_ADMIN,
  PlatformMemberRole.SUPPORT,
] as const;

/**
 * Lists membership of the INTERNAL ops business for assignee pickers
 * (platform work items, etc.). Does not expose Directory platform users.
 */
@ApiTags('platform-ops-members')
@ApiBearerAuth()
@Controller('platform/ops/members')
@UseGuards(PlatformRolesGuard)
@PlatformRoles(...PLATFORM_OPS_MEMBERS_ROLES)
export class PlatformOpsMembersController {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly internalBusiness: InternalBusinessService,
  ) {}

  @Get()
  async list(@Query() query: ListMembersQueryDto) {
    const businessId = await this.internalBusiness.getId();
    return this.membershipService.listForBusiness(businessId, query);
  }
}
