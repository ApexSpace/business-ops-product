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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../../common/decorators/current-user.decorator';
import { PlatformRoles } from '../../../common/decorators/platform-roles.decorator';
import { PlatformRolesGuard } from '../../../common/guards/platform-roles.guard';
import { SetBusinessOwnerDto } from '../dto/set-owner.dto';
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

  @Post('owner')
  @PlatformRoles(PlatformMemberRole.SUPER_ADMIN, PlatformMemberRole.PLATFORM_ADMIN)
  setOwner(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() dto: SetBusinessOwnerDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.membershipService.setOwnerForPlatform(businessId, dto, actor);
  }
}
