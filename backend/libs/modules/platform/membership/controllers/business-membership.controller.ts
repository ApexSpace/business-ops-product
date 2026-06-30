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
import { CreateStaffMemberDto } from '../dto/create-staff-member.dto';
import { ListMembersQueryDto } from '../dto/list-members-query.dto';
import { SetTimeClockPinDto } from '../dto/set-time-clock-pin.dto';
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
  list(@CurrentUser() user: RequestUser, @Query() query: ListMembersQueryDto) {
    return this.membershipService.listForBusiness(user.businessId!, query);
  }

  @Post('invite')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  invite(@CurrentUser() user: RequestUser, @Body() dto: InviteMemberDto) {
    return this.membershipService.invite(user.businessId!, dto, user);
  }

  @Post()
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  createStaff(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateStaffMemberDto,
  ) {
    return this.membershipService.createStaffMember(
      user.businessId!,
      dto,
      user,
    );
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

  @Post(':userId/archive')
  @BusinessRoles(BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN)
  archive(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.membershipService.archiveMember(
      user.businessId!,
      userId,
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

  @Patch(':userId/time-clock-pin')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  setTimeClockPin(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SetTimeClockPinDto,
  ) {
    return this.membershipService.setTimeClockPin(
      user.businessId!,
      userId,
      dto,
      user,
    );
  }

  @Delete(':userId/time-clock-pin')
  @BusinessRoles(
    BusinessMemberRole.OWNER,
    BusinessMemberRole.ADMIN,
    BusinessMemberRole.MEMBER,
  )
  removeTimeClockPin(
    @CurrentUser() user: RequestUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.membershipService.removeTimeClockPin(
      user.businessId!,
      userId,
      user,
    );
  }
}
