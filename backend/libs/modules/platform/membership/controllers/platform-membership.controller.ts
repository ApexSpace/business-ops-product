import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PlatformMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PlatformRoles } from '@app/common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '@app/common/guards/platform-roles.guard';
import { InviteMemberDto } from '../dto/invite-member.dto';
import { SetBusinessOwnerDto } from '../dto/set-owner.dto';
import { MembershipService } from '@app/modules/platform/membership/services/membership.service';

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

  @Post('invite')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  invite(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.membershipService.invite(businessId, dto, actor);
  }

  @Post('owner')
  @PlatformRoles(
    PlatformMemberRole.SUPER_ADMIN,
    PlatformMemberRole.PLATFORM_ADMIN,
  )
  setOwner(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: SetBusinessOwnerDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.membershipService.setOwnerForPlatform(businessId, dto, actor);
  }
}
