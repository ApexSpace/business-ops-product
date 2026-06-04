import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '@prisma/client';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { BusinessRoles } from '@app/common/decorators/business-roles.decorator';
import { BusinessRolesGuard } from '@app/common/guards/business-roles.guard';
import { InviteMemberDto } from '../dto/invite-member.dto';
import { ListMembersQueryDto } from '../dto/list-members-query.dto';
import { UpdateMemberDto } from '../dto/update-member.dto';
import { MembershipService } from '@app/modules/platform/membership/services/membership.service';

@ApiTags('business')
@ApiBearerAuth()
@Controller('businesses/current/members')
@UseGuards(BusinessRolesGuard)
export class BusinessMembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get()
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListMembersQueryDto,
  ) {
    return this.membershipService.listForBusiness(user.businessId!, query);
  }

  @Post('invite')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  invite(@CurrentUser() user: RequestUser, @Body() dto: InviteMemberDto) {
    return this.membershipService.invite(user.businessId!, dto, user);
  }

  @Patch(':userId')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  update(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membershipService.updateMember(
      user.businessId!,
      userId,
      dto,
      user,
    );
  }

  @Delete(':userId')
  @BusinessRoles(BusinessMemberRole.OWNER)
  remove(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.membershipService.removeMember(user.businessId!, userId, user);
  }
}
